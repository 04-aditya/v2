import { logger } from '@/utils/logger';
import { IChatModel } from '@sharedtypes';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { BaseLLM, BaseLLMParams, LLM } from 'langchain/llms/base';

export class AzureChatModel implements IChatModel {
  readonly id = 'gpt35turbo';
  readonly name = 'GPT 3.5 Turbo';
  readonly group = 'Standard';
  readonly enabled = true;
  readonly contexts = [];
  readonly tools = [];
  readonly api_versions: string[];

  readonly azAPIclients: AxiosInstance[] = [];
  currentAzAPIClientIndex = -1;

  constructor() {
    this.api_versions = (process.env['AZ_OPENAI_VERSION'] || '').split(',');
  }

  getAzAPIClient() {
    if (this.azAPIclients.length === 0) {
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
        this.azAPIclients.push(client);
      }
    }
    this.currentAzAPIClientIndex += 1; // round robin
    if (this.currentAzAPIClientIndex >= this.azAPIclients.length) this.currentAzAPIClientIndex = 0;
    logger.debug('Using AZ OpenAI API client', this.currentAzAPIClientIndex);
    const client = this.azAPIclients[this.currentAzAPIClientIndex];
    return client;
  }

  async call(input: { role?: string; content: string }[], options?: Record<string, unknown>): Promise<{ content: string } & Record<string, any>> {
    let result: { content: string } & Record<string, any>;
    const client = this.getAzAPIClient();
    const response = await client.post(`chat/completions?api-version=${this.api_versions[this.currentAzAPIClientIndex]}`, {
      n: options.n,
      stream: false,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      presence_penalty: options.presence_penalty,
      frequency_penalty: options.frequency_penalty,
      stop: options.stop,
      messages: input.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });
    if (response.status === 200) {
      result = {
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
      };
    }
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

  async _call(prompt: string, stop?: string[]): Promise<string> {
    let generations: any = [{ text: prompt }];
    try {
      generations = JSON.parse(prompt);
    } catch (ex) {
      logger.error(`prompt is not a JSON object`);
    }
    const res = await this.client.call([{ content: generations[0].text, role: 'user' }], {
      stop,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      frequencyPenalty: this.frequencyPenalty,
      topP: this.topP,
      topK: this.topK,
    });
    return res.content;
  }
}