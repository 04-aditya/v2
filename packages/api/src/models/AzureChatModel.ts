import { logger } from '@/utils/logger';
import { IChatModel, IChatModelCallParams } from '@sharedtypes';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { fi } from 'date-fns/locale';
import { CallbackManagerForLLMRun } from 'langchain/dist/callbacks';
import { BaseLLMParams, LLM } from 'langchain/llms/base';

const currentAzAPIClientIndex: Record<string, number> = {};
const azAPIclients: Record<string, AxiosInstance[]> = {};

function getAzAPIClient(id: string) {
  if (azAPIclients[id] === undefined || azAPIclients[id].length === 0) {
    const keys = process.env[`AZ_${id}_KEY`].split(',');
    const baseURLs = process.env[`AZ_${id}_URL`].split(',');
    const deployments = process.env[`AZ_${id}_DEPLOYMENT`].split(',');
    azAPIclients[id] = [];
    for (let i = 0; i < keys.length; i++) {
      logger.info(`creating azure ${id} client ${i}...`);
      const client = axios.create({
        baseURL: `${baseURLs[i]}openai/deployments/${deployments[i]}/`,
        headers: {
          'api-key': keys[i],
        },
        timeout: 60000,
      });
      axiosRetry(client, {
        retries: 1,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: error => {
          //console.log(error);
          return true;
        },
      });
      azAPIclients[id].push(client);
    }
  }
  if (currentAzAPIClientIndex[id] === undefined) currentAzAPIClientIndex[id] = -1;
  currentAzAPIClientIndex[id] += 1; // round robin
  if (currentAzAPIClientIndex[id] >= azAPIclients[id].length) currentAzAPIClientIndex[id] = 0;
  logger.debug(`Using AZ ${id} API client`, currentAzAPIClientIndex[id]);
  const client = azAPIclients[id][currentAzAPIClientIndex[id]];
  return client;
}

export class AzureChatModel implements IChatModel {
  readonly id: string = 'gpt35turbo';
  readonly name: string = 'GPT 3.5 Turbo';
  readonly group: string = 'Standard';
  readonly enabled = true;
  readonly contexts = [];
  readonly tools = [];
  readonly api_versions: string[] = (process.env['AZ_gpt35turbo_VERSION'] || '').split(',');
  readonly tokencontextlength: number = 4000;
  //readonly tiktoken = new Tiktoken());
  constructor(id: string, name: string, group: string, tokencontextlength: number) {
    this.id = id;
    this.name = name;
    this.group = group;
    this.api_versions = (process.env[`AZ_${id}_VERSION`] || '').split(',');
    this.tokencontextlength = tokencontextlength;
  }

  counttokens(messages: { role: string; content: string }[]) {
    let count = 0;
    // console.log(messages);
    try {
      messages.forEach(m => {
        count += m.content.length / 4 + 4;
      });
    } catch (ex) {
      logger.error(ex);
    }
    return count;
  }

  async call(data: IChatModelCallParams): Promise<{ content: string } & Record<string, any>> {
    const { input, options } = data;
    const tinput = [...input];
    const result: { content: string } & Record<string, any> = {
      content: '',
      usage: { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0 },
      options: {},
    };
    let skippedcount = 0;
    do {
      let conv_history_tokens = this.counttokens(tinput);
      while (conv_history_tokens > this.tokencontextlength - 500 && tinput.length > 3) {
        logger.warn(`removing first message from input because it is too long (${conv_history_tokens} tokens)`);
        tinput.splice(1, 1);
        skippedcount += 1;
        conv_history_tokens = this.counttokens(tinput);
      }

      const client = getAzAPIClient(this.id);
      const response = await client.post(`chat/completions?api-version=${this.api_versions[currentAzAPIClientIndex[this.id]]}`, {
        n: options.n,
        stream: false,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        top_p: options.top_p,
        presence_penalty: options.presence_penalty,
        frequency_penalty: options.frequency_penalty,
        stop: options.stop,
        messages: tinput.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });
      if (response.status === 200) {
        result.options = { skippedcount, finish_reason: response.data.choices[0].finish_reason };
        result.content += response.data.choices[0].message.content;
        result.usage.completion_tokens += response.data.usage.completion_tokens;
        result.usage.prompt_tokens += response.data.usage.prompt_tokens;
        result.usage.total_tokens += response.data.usage.total_tokens;
      }
      if (result.options.finish_reason === 'length') {
        logger.info(`continuing previous message...`);
        logger.debug(result);
        tinput.push({
          role: 'assistant',
          content: result.content,
        });
        tinput.push({
          role: 'user',
          content: 'continue',
        });
      }
    } while (result.options.finish_reason === 'length');
    return result;
  }

  toJSON(): IChatModel {
    return {
      id: this.id,
      name: this.name,
      group: this.group,
      enabled: this.enabled,
      contexts: this.contexts,
      tools: this.tools,
    };
  }
}

export interface AzureOpenAIInput {
  /** Sampling temperature to use */
  temperature?: number;

  /**
   * Maximum number of tokens to generate in the completion.
   */
  maxTokens?: number;

  /** Total probability mass of tokens to consider at each step */
  topP?: number;

  /** Integer to define the top tokens considered within the sample operation to create new text. */
  topK?: number;

  /** Penalizes repeated tokens according to frequency */
  frequencyPenalty?: number;

  modelid?: string;
}

export class AzureOpenAI extends LLM implements AzureOpenAIInput {
  client: AzureChatModel;
  temperature: number | undefined = undefined;

  maxTokens: number | undefined = undefined;

  topP: number | undefined = undefined;

  topK: number | undefined = undefined;

  frequencyPenalty: number | undefined = undefined;

  constructor(fields?: Partial<AzureOpenAIInput> & BaseLLMParams) {
    super(fields ?? {});

    this.client = fields?.modelid ? new AzureChatModel(fields.modelid, '', '', 4000) : new AzureChatModel('gpt35turbo', 'GPT3.5', 'Standard', 4000);

    this.temperature = fields?.temperature ?? this.temperature;
    this.maxTokens = fields?.maxTokens ?? this.maxTokens;
    this.topP = fields?.topP ?? this.topP;
    this.topK = fields?.topK ?? this.topK;
    this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty;
  }

  _llmType(): string {
    return 'AzureOpenAI';
  }

  async _call(prompt: string, options: this['ParsedCallOptions'], runManager?: CallbackManagerForLLMRun): Promise<string> {
    let generations: any = [{ data: { content: prompt }, type: 'human' }];
    try {
      generations = JSON.parse(prompt);
      logger.debug(generations);
    } catch (ex) {
      logger.debug(`prompt is not a JSON object, using prompt as a string.`);
      logger.warn(generations);
    }
    const res = await this.client.call({
      input: generations.map(g => ({ content: g.data.content, role: g.type === 'human' ? 'user' : g.type })),
      options: {
        stop: options.stop,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        frequencyPenalty: this.frequencyPenalty,
        topP: this.topP,
        topK: this.topK,
      },
    });
    return res.content;
  }
}
