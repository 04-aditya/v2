/* eslint-disable @typescript-eslint/no-inferrable-types */
import { APIResponse, IChatSession, IChatMessage, IChatModel } from '@sharedtypes';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
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
import { UserDataEntity } from '@/entities/userdata.entity';

// import { OpenAI } from 'langchain/llms';
// const openai = new OpenAI();
// openai.generate(['Tell me a joke.']).then(console.log).catch(console.error);

const azAPIclients: AxiosInstance[] = [];
let currentAzAPIClientIndex = 0;
function getAzAPIClient(): AxiosInstance {
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
  if (currentAzAPIClientIndex >= azAPIclients.length) currentAzAPIClientIndex = 0;
  logger.debug('Using AZ OpenAI API client', currentAzAPIClientIndex);
  const client = azAPIclients[currentAzAPIClientIndex];
  currentAzAPIClientIndex += 1; // round robin
  return client;
}

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
  static readonly CHATFAVOURITEKEY = 'chatfavourite';
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
      logger.error(ex);
      bodhiModel.enabled = false;
    }

    const result = new APIResponse<IChatModel[]>();
    result.data = [];

    result.data.push({
      id: 'gpt35turbo',
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
  @Authorized(['chat.read'])
  @OpenAPI({ summary: 'Return the chat history of the current user' })
  async getChatHistory(
    @CurrentUser() currentUser: UserEntity,
    @QueryParam('offset') offset = 0,
    @QueryParam('limit') limit = 10,
    @QueryParam('type') type: string = 'private',
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    if (type === 'favourite') {
      return await this.getChatFavourites(currentUser, offset, limit);
    }
    const result = new APIResponse<IChatSession[]>();
    result.data = [];

    const repo = AppDataSource.getRepository(ChatSessionEntity);

    let sessions: ChatSessionEntity[];

    if (type === 'public') {
      sessions = await repo.find({
        where: {
          type: 'public',
        },
        order: {
          updatedAt: 'desc',
        },
        skip: offset,
        take: limit,
      });
    } else {
      sessions = await repo.find({
        where: {
          userid: currentUser.email,
        },
        order: {
          updatedAt: 'desc',
        },
        skip: offset,
        take: limit,
      });
    }

    sessions.forEach(s => result.data.push(s.toJSON()));

    return result;
  }

  @Get('/stats')
  @OpenAPI({ summary: 'Return the chat history of the current user' })
  async getChatStats(
    @CurrentUser() currentUser: UserEntity,
    @QueryParam('type') type: string | undefined = 'user',
    @QueryParam('offset') offset = 0,
    @QueryParam('limit') limit = 10,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<{ userid: string; count: number; total_tokens: number }[]>();
    result.data = [];

    const data = await AppDataSource.query(
      `
        SELECT
        userid,
        COUNT(*) AS count,
        SUM(cast(options::jsonb->'usage'->'total_tokens' as integer)) AS total_tokens
        FROM chatsession
        GROUP BY userid
        ORDER BY count desc
        LIMIT ${limit}
      `,
    );
    data.forEach(d => result.data.push({ userid: d.userid, count: d.count, total_tokens: d.total_tokens }));
    return result;
  }

  @Get('/favourites')
  @OpenAPI({ summary: 'Return the chat favourites of the current user' })
  async getChatFavourites(@CurrentUser() currentUser: UserEntity, @QueryParam('offset') offset = 0, @QueryParam('limit') limit = 10) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<Array<{ id: string; timestamp: Date }>>();
    result.data = [];

    logger.debug('fetching favourites');
    const repo = AppDataSource.getRepository(UserDataEntity);

    const dataset = await repo.find({
      where: {
        userid: currentUser.id,
        key: ChatController.CHATFAVOURITEKEY,
      },
      order: {
        timestamp: 'desc',
      },
      skip: offset,
      take: limit,
    });
    dataset.forEach((s: UserDataEntity) => result.data.push({ id: s.value as string, timestamp: s.timestamp }));

    return result;
  }

  @Get('/public')
  @OpenAPI({ summary: 'Return the chat sessions that are shared' })
  async getSharedChatSessions(@CurrentUser() currentUser: UserEntity, @QueryParam('offset') offset = 0, @QueryParam('limit') limit = 10) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<Array<{ id: string; timestamp: Date }>>();
    result.data = [];

    logger.debug('fetching public chats');
    const repo = AppDataSource.getRepository(UserDataEntity);

    const dataset = await repo.find({
      where: {
        userid: currentUser.id,
        type: 'public',
      },
      order: {
        timestamp: 'desc',
      },
      skip: offset,
      take: limit,
    });

    dataset.forEach((s: UserDataEntity) => result.data.push({ id: s.value as string, timestamp: s.timestamp }));

    return result;
  }

  @Get('/:id/favourite')
  @OpenAPI({ summary: 'Return the chat favourite status of the current user' })
  @Authorized(['chat.write'])
  async getChatFavouriteStatus(@Param('id') id: string, @CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    try {
      const repo = AppDataSource.getRepository(ChatSessionEntity);
      logger.debug(`getting favourite for ${id}`);
      const session = await repo.findOne({
        where: {
          id,
          userid: currentUser.email,
        },
      });
      if (!session) return new HttpError(404);

      const userdatarepo = AppDataSource.getRepository(UserDataEntity);
      const exfavdata = await userdatarepo.findOne({
        where: {
          key: ChatController.CHATFAVOURITEKEY,
          userid: currentUser.id,
          value: JSON.stringify(id),
        },
      });

      return new APIResponse<boolean>(exfavdata ? true : false);
    } catch (ex) {
      logger.debug(ex);
    }
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Return the chat session identified by the id' })
  @Authorized(['chat.read'])
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
  @Authorized(['chat.write.self'])
  async createChatSession(
    @CurrentUser() currentUser: UserEntity,
    @BodyParam('message') message_param?: string,
    @BodyParam('id') sessionid_param?: string,
    @BodyParam('name') name_param?: string,
    @BodyParam('group') group_param?: string,
    @BodyParam('type') type_param?: string,
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

    //TODO: validate
    if (name_param) session.name = name_param;
    if (group_param) session.group = group_param;
    if (type_param) {
      switch (type_param.toLowerCase()) {
        case 'public':
          session.type = 'public';
          break;
        case 'private':
          session.type = 'private';
          break;
      }
    }
    // if (path) session.name = path;

    if (!message_param && sessionid_param) {
      await repo.save(session);
      result.data = session.toJSON();
      logger.debug(`updated session: ${session.id}}`);
      return result;
    }

    if (!sessionid_param) {
      session.name = name_param || message.substring(0, 45);
      session.userid = currentUser.email;
      session.messages = [];
    }

    const model = model_param || (sessionid_param ? session.options.model : 'gpt35turbo');
    const model_version = model_version_param || (sessionid_param ? session.options.model_version : process.env['AZ_OPENAI_VERSION']).split(',')[0];
    const contexts = contexts_param || (sessionid_param ? session.options.contexts : []);
    session.options = { ...session.options, model, model_version, contexts };
    session.options.usage = session.options.usage ?? { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };

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
          return await getAzAPIClient().post(`chat/completions?api-version=${model_version}`, {
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
    messages.push(assistantMessage);
    if (response.data.usage) {
      session.options.usage.total_tokens += response.data.usage.total_tokens;
      session.options.usage.prompt_tokens += response.data.usage.prompt_tokens;
      session.options.usage.completion_tokens += response.data.usage.completion_tokens;
    }
    await AppDataSource.getRepository(ChatMessageEntity).save(messages);
    session.messages = messages;
    await repo.save(session);
    result.data = session.toJSON();
    return result;
  }

  @Delete('/:id')
  @OpenAPI({ summary: 'Share or unshare a chat session identified by the id' })
  @Authorized(['chat.write.self'])
  async deleteChatSession(@Param('id') id: string, @CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const session = await repo.findOne({
      where: {
        id,
      },
    });
    if (!session) return new HttpError(404);
    if (session.userid !== currentUser.email) return new HttpError(403);
    await repo.softDelete(session.id);
    logger.debug(`deleted session ${session.id}`);
    return 'OK';
  }

  @Post('/:id/sharing')
  @OpenAPI({ summary: 'Share or unshare a chat session identified by the id' })
  @Authorized(['chat.write.self'])
  async updateChatSessionSharing(@Param('id') id: string, @CurrentUser() currentUser: UserEntity, @BodyParam('type') type_param?: string) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const session = await repo.findOne({
      where: {
        id,
        userid: currentUser.email,
      },
    });
    if (!session) return new HttpError(404);

    let newtype = session.type;
    if (type_param) {
      switch (type_param.toLowerCase()) {
        case 'public':
          newtype = 'public';
          break;
        case 'private':
          newtype = 'private';
          break;
      }
    }
    const ures = await repo.update(session.id, {
      type: newtype,
      updatedAt: () => '"updatedAt"',
    });
    const result = new APIResponse<IChatSession>();
    result.data = { ...session.toJSON(), type: newtype };
    return result;
  }
  @Post('/:id/favourite')
  @OpenAPI({ summary: 'Share or unshare a chat session identified by the id' })
  @Authorized(['chat.write.self'])
  async favouriteChatSession(@Param('id') id: string, @CurrentUser() currentUser: UserEntity, @BodyParam('status') status = false) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    try {
      const repo = AppDataSource.getRepository(ChatSessionEntity);

      const session = await repo.findOne({
        where: {
          id,
        },
      });
      if (!session) return new HttpError(404);

      const userdatarepo = AppDataSource.getRepository(UserDataEntity);
      const exfavdata = await userdatarepo.findOne({
        where: {
          key: ChatController.CHATFAVOURITEKEY,
          userid: currentUser.id,
          value: JSON.stringify(id),
        },
      });

      if (exfavdata) {
        logger.debug(exfavdata.toJSON());
        if (status) return 'ok';
        await exfavdata.remove();
        return 'ok';
      }

      if (status) {
        logger.debug(`creating new favourite ${id} for user ${currentUser.email}`);
        const favdata = await UserDataEntity.create({
          userid: currentUser.id,
          key: ChatController.CHATFAVOURITEKEY,
          value: id,
          timestamp: new Date(),
        }).save();
        await favdata.save();
        logger.debug(favdata.toJSON());
      }
      return { data: 'ok' };
    } catch (err) {
      console.log(err);
    }
  }
}
