import { IChatModel } from '@sharedtypes';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { AzureChatModel } from './AzureChatModel';
import { PSBodhiChatModel } from './PSBodhiChatModel';
import { BasicAgentChatModel } from './BasicAgentChatModel';

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

export default class ModelFactory {
  private static _models: Map<string, IChatModel>;

  static async models() {
    // if (ModelFactory._models) {
    //   return ModelFactory._models;
    // }

    ModelFactory._models = new Map<string, IChatModel>();
    const models: IChatModel[] = [];

    models.push(new AzureChatModel());
    models.push({
      id: 'gpt4-test',
      name: 'GPT 4 (preview)',
      group: 'Standard',
      enabled: false,
      contexts: [],
      tools: [],
    });

    const psmodel = new PSBodhiChatModel();
    await psmodel.refresh();
    models.push(psmodel);

    //models.push(new AutoGPTChatModel());
    // models.push({
    //   id: 'autogpt',
    //   name: 'AutoGPT (3.5)',
    //   group: 'Experimental',
    //   enabled: false,
    //   contexts: [],
    //   tools: [],
    // });

    //if (NODE_ENV !== 'production') {
    models.push(new BasicAgentChatModel());
    //}

    models.forEach(m => ModelFactory._models.set(m.id, m));

    return ModelFactory._models;
  }
}
