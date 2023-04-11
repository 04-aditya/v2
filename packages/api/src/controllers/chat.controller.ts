import { APIResponse, IChatSession, IChatMessage, IChatModel } from '@sharedtypes';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import {
  JsonController,
  UseBefore,
  Get,
  Authorized,
  Post,
  Body,
  CurrentUser,
  Delete,
  BodyParam,
  HttpError,
  Param,
  QueryParam,
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { ChatSessionEntity } from '@/entities/chatsession.entity';
import { ChatMessageEntity } from '@/entities/chatmessage.entity';

// import { OpenAI } from 'langchain/llms';
// const openai = new OpenAI();
// openai.generate(['Tell me a joke.']).then(console.log).catch(console.error);

const openaiclient = axios.create({
  baseURL: `${process.env['AZ_OPENAI_URL']}openai/deployments/`,
  headers: {
    'api-key': process.env['AZ_OPENAI_KEY'],
  },
});
axiosRetry(openaiclient, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    console.log(error);
    return true;
  },
});

const psbodhiclient = axios.create({
  baseURL: process.env['PSBODHI_URL'],
  headers: {
    'access-token': process.env['PSBODHI_KEY'],
  },
});
axiosRetry(psbodhiclient, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    console.log(error);
    return true;
  },
});

@JsonController('/api/chat')
@UseBefore(authMiddleware)
export class ChatController {
  @Get('/models')
  @OpenAPI({ summary: 'Return the chat models for the current user' })
  async getChatModels(@CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const bodhiModel: IChatModel = {
      id: 'psbodhi',
      name: 'PSBodhi',
      group: 'Custom',
      enabled: true,
      contexts: [],
    };
    try {
      const contextsResponse = await psbodhiclient.get('contexts');
      if (contextsResponse.status === 200) {
        contextsResponse.data.forEach((c: any) => {
          bodhiModel.contexts.push({
            id: c._id,
            name: c.name,
            description: c.description,
            enabled: true,
          });
        });
      }
    } catch (ex) {
      console.error(ex);
    }

    const result = new APIResponse<IChatModel[]>();
    result.data = [];

    result.data.push({
      id: 'gpt35turbo-test',
      name: 'GPT 3.5 Turbo',
      group: 'Standard',
      enabled: true,
      contexts: [],
    });
    result.data.push({
      id: 'gpt4-test',
      name: 'GPT 4 (preview)',
      group: 'Standard',
      enabled: false,
      contexts: [],
    });
    result.data.push(bodhiModel);

    return result;
  }

  @Get('/history')
  @OpenAPI({ summary: 'Return the chat history of the current user' })
  async getChatHistory(
    @CurrentUser() currentUser: UserEntity,
    @QueryParam('type') type: string|undefined = '',
    @QueryParam('offset') offset = 0,
    @QueryParam('limit') limit = 10,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<IChatSession[]>();
    result.data = [];

    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const sessions: ChatSessionEntity[] = await repo.find({
      where: {
        userid: currentUser.email,
      },
      order: {
        updatedAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    sessions.forEach(s => result.data.push(s.toJSON()));

    return result;
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Return the chat history of the current user' })
  async getChatSession(@Param('id') id: string, @CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const session = await repo.findOne({
      where: {
        id,
      },
      relations: ['messages'],
    });
    if (!session) return;

    const result = new APIResponse<IChatSession>();
    result.data = session.toJSON();
    return result;
  }

  @Post('/')
  @OpenAPI({ summary: 'Create a new chat session' })
  async createChatSession(
    @CurrentUser() currentUser: UserEntity,
    @BodyParam('message') message_param: string,
    @BodyParam('model') model_param?: string,
    @BodyParam('assistant') assistant_param?: string,
    @BodyParam('contexts') contexts_param?: string[],
    @BodyParam('model_version') model_version_param?: string,
    @BodyParam('parameters') parameters?: Record<string, unknown>,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<IChatSession>();
    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const message = message_param;
    const model = model_param || process.env['AZ_OPENAI_DEPLOYMENT'];
    const model_version = model_version_param || process.env['AZ_OPENAI_VERSION'];
    const contexts = contexts_param || [];

    const session = new ChatSessionEntity();
    session.name = message.substring(0, 45);
    session.userid = currentUser.email;
    session.options = { model, model_version, contexts };

    const systemMessage = new ChatMessageEntity();
    systemMessage.role = 'system';
    systemMessage.content = assistant_param || 'You are a helpful assistant.';
    systemMessage.index = 0;

    const newMessage = new ChatMessageEntity();
    newMessage.content = message;
    newMessage.role = 'user';
    newMessage.index = 1;

    try {
      const reqparams = { ...(parameters || {}) };
      reqparams.n = 1;
      reqparams.stream = false;
      const assistantMessage = new ChatMessageEntity();
      assistantMessage.role = 'assistant';
      assistantMessage.index = 2;
      if (model === 'psbodhi') {
        const response = await psbodhiclient.post('/ask/', {
          messages: [systemMessage, newMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          contexts,
          model: 'IGNORED',
          max_tokens: 0,
          temperature: reqparams.temperature || 0,
        });
        logger.debug(response.data);
        logger.debug(response.data.choices[0].message);
        assistantMessage.content = response.data.choices[0].message.content;
        session.options.usage = response.data.usage;
      } else {
        const response = await openaiclient.post(`${model}/chat/completions?api-version=${model_version}`, {
          ...reqparams,
          messages: [systemMessage, newMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        });
        logger.debug(response.data);
        logger.debug(response.data.choices[0].message);
        assistantMessage.content = response.data.choices[0].message.content;
        session.options.usage = response.data.usage;
      }
      await AppDataSource.getRepository(ChatMessageEntity).save([systemMessage, newMessage, assistantMessage]);
      session.messages = [systemMessage, newMessage, assistantMessage];
      await repo.save(session);
      result.data = session.toJSON();
      return result;
    } catch (ex) {
      console.error(ex);
      const ar = ex as AxiosError;
      if (ar) {
        console.log(ar.response?.data);
        throw new HttpError(500, 'Unable to create chat session');
      }
    }
  }

  @Post('/:sessionid')
  @OpenAPI({ summary: 'Send a message to existing chat session' })
  async addMessageToChatSession(
    @CurrentUser() currentUser: UserEntity,
    @Param('sessionid') sessionid: string,
    @BodyParam('message') message_param: string,
    @BodyParam('prompt') prompt_param?: string,
    @BodyParam('parameters') parameters?: Record<string, unknown>,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<IChatSession>();
    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const session = await repo.findOne({
      where: {
        id: sessionid,
        userid: currentUser.email,
      },
      relations: ['messages'],
    });
    if (!repo) {
      throw new HttpError(404, 'Chat Session not found');
    }

    const message = message_param;
    const model = session.options.model;
    const model_version = session.options.model_version;
    const contexts = session.options.contexts || [];
    // session.options = { model, model_version };

    const newMessage = new ChatMessageEntity();
    newMessage.content = message;
    newMessage.role = 'user';

    try {
      const reqparams = { ...(parameters || {}) };
      reqparams.n = 1;
      reqparams.stream = false;
      const assistantMessage = new ChatMessageEntity();
      assistantMessage.role = 'assistant';
      assistantMessage.index = session.messages.length;

      if (model === 'psbodhi') {
        const response = await psbodhiclient.post('ask/', {
          messages: [...session.messages, newMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          contexts,
          model: 'IGNORED',
          max_tokens: 0,
          temperature: reqparams.temperature || 0,
        });
        logger.debug(response.data);
        logger.debug(response.data.choices[0].message);
        assistantMessage.content = response.data.choices[0].message.content;
        session.options.usage = response.data.usage;
      } else {
        const response = await openaiclient.post(`${model}/chat/completions?api-version=${model_version}`, {
          messages: [...session.messages, newMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        });
        logger.debug(response.data);
        assistantMessage.content = response.data.choices[0].message.content;
        session.options.usage = response.data.usage;
      }

      await AppDataSource.getRepository(ChatMessageEntity).save([newMessage, assistantMessage]);
      session.messages.push(newMessage);
      session.messages.push(assistantMessage);
      await repo.save(session);
      result.data = session.toJSON();
      return result;
    } catch (ex) {
      console.error(ex);
      const ar = ex as AxiosError;
      if (ar) {
        console.log(ar.response?.data);
        throw new HttpError(500, 'Unable to send a new message to chat session');
      }
    }
  }
}
