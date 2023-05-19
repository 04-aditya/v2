import { logger } from '@/utils/logger';
import { IChatModel, IChatModelCallParams } from '@sharedtypes';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { CallbackManagerForLLMRun } from 'langchain/dist/callbacks';
import { BaseLLMParams, LLM } from 'langchain/llms/base';

let currentAzAPIClientIndex = -1;
const azAPIclients: AxiosInstance[] = [];
const api_versions: string[] = (process.env['AZ_OPENAI_VERSION'] || '').split(',');

function getAzAPIClient() {
  if (azAPIclients.length === 0) {
    const keys = process.env['AZ_OPENAI_KEY'].split(',');
    const baseURLs = process.env['AZ_OPENAI_URL'].split(',');
    const deployments = process.env['AZ_OPENAI_DEPLOYMENT'].split(',');
    for (let i = 0; i < keys.length; i++) {
      logger.info(`creating azure client ${i}...`);
      const client = axios.create({
        baseURL: `${baseURLs[i]}openai/deployments/${deployments[i]}/`,
        headers: {
          'api-key': keys[i],
        },
        timeout: 60000,
      });
      axiosRetry(client, {
        retries: 2,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: error => {
          console.log(error);
          return true;
        },
      });
      azAPIclients.push(client);
    }
  }
  currentAzAPIClientIndex += 1; // round robin
  if (currentAzAPIClientIndex >= azAPIclients.length) currentAzAPIClientIndex = 0;
  logger.debug('Using AZ OpenAI API client', currentAzAPIClientIndex);
  const client = azAPIclients[currentAzAPIClientIndex];
  return client;
}

export class AzureChatModel implements IChatModel {
  readonly id = 'gpt35turbo';
  readonly name = 'GPT 3.5 Turbo';
  readonly group = 'Standard';
  readonly enabled = true;
  readonly contexts = [];
  readonly tools = [];
  //readonly tiktoken = new Tiktoken());

  counttokens(messages: { role: string; content: string }[]) {
    let count = 0;
    messages.forEach(m => {
      count += m.content.length / 4 + 4;
    });
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
      while (conv_history_tokens > 3500 && tinput.length > 3) {
        logger.warn(`removing first message from input because it is too long (${conv_history_tokens} tokens)`);
        tinput.splice(1, 1);
        skippedcount += 1;
        conv_history_tokens = this.counttokens(tinput);
      }

      const client = getAzAPIClient();
      const response = await client.post(`chat/completions?api-version=${api_versions[currentAzAPIClientIndex]}`, {
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
}

export class AzureOpenAI extends LLM implements AzureOpenAIInput {
  client = new AzureChatModel();
  temperature: number | undefined = undefined;

  maxTokens: number | undefined = undefined;

  topP: number | undefined = undefined;

  topK: number | undefined = undefined;

  frequencyPenalty: number | undefined = undefined;

  constructor(fields?: Partial<AzureOpenAIInput> & BaseLLMParams) {
    super(fields ?? {});

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
    let generations: any = [{ text: prompt }];
    try {
      generations = JSON.parse(prompt);
    } catch (ex) {
      logger.debug(`prompt is not a JSON object, using prompt as a string.`);
    }
    const res = await this.client.call({
      input: [{ content: generations[0].text, role: 'user' }],
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
