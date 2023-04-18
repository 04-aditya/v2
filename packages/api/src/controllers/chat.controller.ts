import { APIResponse, IChatSession, IChatMessage, IChatModel } from '@sharedtypes';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import axios, { AxiosError, AxiosResponse } from 'axios';
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
import { Not, MoreThan, Equal, And } from 'typeorm';
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
  timeout: 60000,
});
axiosRetry(openaiclient, {
  retries: 2,
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
    @QueryParam('type') type: string | undefined = 'private',
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
        type,
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
  @OpenAPI({ summary: 'Return the chat session identified by the id' })
  async getChatSession(@Param('id') id: string, @CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const session = await repo.findOne({
      where: [
        {
          id,
          userid: currentUser.email,
        },
        {
          id,
          type: 'public',
        },
      ],
      relations: ['messages'],
    });
    if (!session) return;

    if (session.userid !== currentUser.email && session.type === 'private') {
      throw new HttpError(403);
    }

    const result = new APIResponse<IChatSession>();
    result.data = session.toJSON();
    return result;
  }

  // @Get('/:id/messages')
  // @OpenAPI({ summary: 'Return the chat messages of a session identified by the id' })
  // async getChatSessionMessages(
  //   @Param('id') id: string,
  //   @CurrentUser() currentUser: UserEntity,
  //   @QueryParam('offset') offset = 0,
  //   @QueryParam('limit') limit = 10,
  // ) {
  //   if (!currentUser) throw new HttpException(403, 'Unauthorized');

  //   const repo = AppDataSource.getRepository(ChatSessionEntity);

  //   const session = await repo.findOne({
  //     where: {
  //       id,
  //     },
  //     relations: ['messages'],
  //     take: limit,
  //   });
  //   if (!session) return;

  //   const result = new APIResponse<IChatMessage[]>();
  //   result.data = [];

  //   session.messages.forEach(m => result.data.push(m.toJSON()));

  //   return result;
  // }

  @Post('/')
  @OpenAPI({ summary: 'Create or continue a chat session' })
  async createChatSession(
    @CurrentUser() currentUser: UserEntity,
    @BodyParam('message') message_param: string,
    @BodyParam('id') sessionid_param?: string,
    @BodyParam('messageid') messageid_param?: string,
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

    const session = sessionid_param
      ? await repo.findOne({
          where: {
            id: sessionid_param,
            userid: currentUser.email,
          },
          relations: ['messages'],
        })
      : new ChatSessionEntity();

    if (!sessionid_param) {
      session.name = message.substring(0, 45);
      session.userid = currentUser.email;
      session.messages = [];
    }

    const model = model_param || (sessionid_param ? session.options.model : process.env['AZ_OPENAI_DEPLOYMENT']);
    const model_version = model_version_param || (sessionid_param ? session.options.model_version : process.env['AZ_OPENAI_VERSION']);
    const contexts = contexts_param || (sessionid_param ? session.options.contexts : []);
    session.options = { model, model_version, contexts };

    const messages: ChatMessageEntity[] = [];
    for (let i = 0; i < session.messages.length; i++) {
      const m = session.messages[i];
      if (m.id === messageid_param) {
        break;
      }
      messages.push(m);
    }

    const systemMessage = sessionid_param ? null : new ChatMessageEntity();
    if (systemMessage) {
      systemMessage.role = 'system';
      systemMessage.content = assistant_param || 'You are a helpful assistant.';
      systemMessage.index = 0;
      messages.push(systemMessage);
    }

    const newMessage = new ChatMessageEntity();
    newMessage.content = message;
    newMessage.role = 'user';
    newMessage.index = messages.length;
    newMessage.options = { model, model_version, contexts };
    messages.push(newMessage);

    const assistantMessage = new ChatMessageEntity();
    assistantMessage.role = 'assistant';
    assistantMessage.index = messages.length;

    const callAPI = async () => {
      try {
        const reqparams = { ...(parameters || {}) };
        reqparams.n = 1;
        reqparams.stream = false;
        if (model === 'psbodhi') {
          return await psbodhiclient.post('/ask/', {
            sessionid: session.id,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            contexts,
            model: 'IGNORED',
            max_tokens: 0,
            temperature: reqparams.temperature || 0,
          });
        } else {
          return await openaiclient.post(`${model}/chat/completions?api-version=${model_version}`, {
            ...reqparams,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
          });
        }
      } catch (ex) {
        console.error(ex);
        const ar = ex as AxiosError;
        if (ar) {
          console.log(ar.response?.data);
          throw new HttpError(500, 'Unable to create/continue chat session');
        }
      }
    };
    const response: AxiosResponse = await callAPI();
    logger.debug(response.data);
    logger.debug(response.data.choices[0].message);
    assistantMessage.content = response.data.choices[0].message.content;
    session.options.usage = response.data.usage;
    messages.push(assistantMessage);
    await AppDataSource.getRepository(ChatMessageEntity).save(messages);
    session.messages = messages;
    await repo.save(session);
    result.data = session.toJSON();
    return result;
  }

  @Post('/:id/')
  @OpenAPI({ summary: 'Update properties of a session identified by the id' })
  async updateChatSession(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
    @BodyParam('name') name?: string,
    @BodyParam('group') group?: string,
    @BodyParam('type') type?: string,
    @BodyParam('path') path?: string,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const session = await repo.findOne({
      where: {
        id,
        userid: currentUser.email,
      },
      relations: ['messages'],
    });
    if (!session) return;

    //TODO: validate parameters
    if (name) session.name = name;
    if (group) session.name = group;
    if (type) session.name = type;
    if (path) session.name = path;

    await session.save();

    const result = new APIResponse<IChatSession[]>();
    result.data = session.toJSON();
    return result;
  }
}
