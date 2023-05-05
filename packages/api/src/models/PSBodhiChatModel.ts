import { logger } from '@/utils/logger';
import { IChatModel } from '@sharedtypes';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

const psbodhiclient = axios.create({
  baseURL: process.env['PSBODHI_URL'],
  headers: {
    'access-token': process.env['PSBODHI_KEY'],
  },
  timeout: 60000,
});
axiosRetry(psbodhiclient, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    console.log(error);
    return true;
  },
});

export class PSBodhiChatModel implements IChatModel {
  readonly id = 'psbodhi';
  readonly name = 'PSBodhi';
  readonly group = 'Custom';
  readonly contexts = [];
  readonly tools = [];
  enabled = true;

  async refresh() {
    try {
      const contextsResponse = await psbodhiclient.get('/contexts/');
      if (contextsResponse.status === 200) {
        contextsResponse.data.forEach((c: any) => {
          //if (c.display)
          {
            this.contexts.push({
              id: c._id,
              name: c.name,
              description: c.description,
              enabled: c.display,
            });
          }
        });
      }
    } catch (ex) {
      logger.error(ex);
      this.enabled = false;
    }
  }

  async call(input: { role?: string; content: string }[], options?: Record<string, unknown>): Promise<{ content: string } & Record<string, any>> {
    let result: { content: string } & Record<string, any>;
    const response = await psbodhiclient.post(`/ask/`, {
      sessionid: options.sessionid,
      contexts: options.contexts,
      model: 'IGNORED',
      max_tokens: 0,
      temperature: options.temperature || 0,
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
