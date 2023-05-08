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
  Req,
} from 'routing-controllers';
import { Not, MoreThan, Equal, And } from 'typeorm';
import { OpenAPI } from 'routing-controllers-openapi';
import { ChatSessionEntity } from '@/entities/chatsession.entity';
import { ChatMessageEntity } from '@/entities/chatmessage.entity';
import { UserDataEntity } from '@/entities/userdata.entity';
import ModelFactory from '@/models/model_factory';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { checkADTokens } from './auth.controller';

// import { OpenAI } from 'langchain/llms';
// const openai = new OpenAI();
// openai.generate(['Tell me a joke.']).then(console.log).catch(console.error);

// const azAPIclients: AxiosInstance[] = [];
// let currentAzAPIClientIndex = 0;
// function getAzAPIClient(): AxiosInstance {
//   if (azAPIclients.length === 0) {
//     const keys = process.env['AZ_OPENAI_KEY'].split(',');
//     const baseURLs = process.env['AZ_OPENAI_URL'].split(',');
//     const deployments = process.env['AZ_OPENAI_DEPLOYMENT'].split(',');
//     for (let i = 0; i < keys.length; i++) {
//       logger.info(`creating azure client ${i}...`);
//       const client = axios.create({
//         baseURL: `${baseURLs[i]}openai/deployments/${deployments[i]}/`,
//         headers: {
//           'api-key': keys[i],
//         },
//         timeout: 60000,
//       });
//       axiosRetry(client, {
//         retries: 2,
//         retryDelay: axiosRetry.exponentialDelay,
//         retryCondition: error => {
//           console.log(error);
//           return true;
//         },
//       });
//       azAPIclients.push(client);
//     }
//   }
//   if (currentAzAPIClientIndex >= azAPIclients.length) currentAzAPIClientIndex = 0;
//   logger.debug('Using AZ OpenAI API client', currentAzAPIClientIndex);
//   const client = azAPIclients[currentAzAPIClientIndex];
//   currentAzAPIClientIndex += 1; // round robin
//   return client;
// }

// const psbodhiclient = axios.create({
//   baseURL: process.env['PSBODHI_URL'],
//   headers: {
//     'access-token': process.env['PSBODHI_KEY'],
//   },
//   timeout: 60000,
// });
// axiosRetry(psbodhiclient, {
//   retries: 2,
//   retryDelay: axiosRetry.exponentialDelay,
//   retryCondition: error => {
//     console.log(error);
//     return true;
//   },
// });

@JsonController('/api/chat')
@UseBefore(authMiddleware)
export class ChatController {
  static readonly CHATFAVOURITEKEY = 'chatfavourite';
  @Get('/models')
  @OpenAPI({ summary: 'Return the chat models for the current user' })
  async getChatModels(@CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');
    const result = new APIResponse<IChatModel[]>();
    try {
      result.data = [...(await ModelFactory.models()).values()];
    } catch (ex) {
      console.error(ex);
      throw new HttpError(500);
    }
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
        GROUP BY userid ORDER BY count desc
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
  @OpenAPI({ summary: 'Create or update/continue a chat session' })
  @Authorized(['chat.write'])
  async createOrUpdateChatSession(
    @CurrentUser() currentUser: UserEntity,
    @Req() req: RequestWithUser,
    @BodyParam('message') message_param?: string,
    @BodyParam('id') sessionid_param?: string,
    @BodyParam('name') name_param?: string,
    @BodyParam('tags') tags_param?: string[],
    @BodyParam('type') type_param?: string,
    @BodyParam('messageid') messageid_param?: number,
    @BodyParam('model') model_param?: string,
    @BodyParam('assistant') assistant_param?: string,
    @BodyParam('contexts') contexts_param?: string[],
    @BodyParam('parameters') parameters?: Record<string, any>,
    @BodyParam('tooloptions') tooloptions?: Record<string, any>,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<IChatSession>();
    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const message = message_param;

    let session = new ChatSessionEntity();

    if (sessionid_param) {
      session = await repo.findOne({
        where: {
          id: sessionid_param,
        },
        relations: ['messages'],
      });

      if (!session) throw new HttpError(404);

      if (session.userid !== currentUser.email) {
        if (req.permissions.indexOf('chat.write.all') === -1) {
          throw new HttpError(403);
        }
      }
    }

    //TODO: validate
    if (name_param) session.name = name_param;
    if (tags_param) session.tags = tags_param;
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

    // if message and session id is specified updated the attributes and return
    if (!message_param && sessionid_param) {
      await repo.save(session);
      result.data = session.toJSON();
      logger.debug(`updated session: ${session.id}}`);
      return result;
    }

    //if session is is not specified create a new session
    if (!sessionid_param) {
      session.name = name_param || message.substring(0, 45);
      session.userid = currentUser.email;
      session.messages = [];
    }

    const modelid = (model_param || (sessionid_param ? session.options.model : 'gpt35turbo')) as string;
    const model = (await ModelFactory.models()).get(modelid);
    const contexts = contexts_param || (sessionid_param ? session.options.contexts : []);
    session.options = { ...session.options, model: modelid, contexts };
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
    newMessage.options = { model: modelid, contexts };
    messages.push(newMessage);

    const assistantMessage = new ChatMessageEntity();
    assistantMessage.role = 'assistant';
    assistantMessage.index = messages.length;

    const options: Record<string, any> = {
      n: 1,
      stream: false,
      sessionid: session.id,
      contexts,
      ...(parameters || {}),
      user: currentUser,
    };

    const inputMessages = messages.map(m => m.toJSON());
    inputMessages[0].content +=
      `\n Your name is PSChat a LLM powered chatbot developed by publicis sapient's engineers.` +
      `The frontend was developed in React and the backend in NodeJS and Python.` +
      `Your are helping a Human named maskedhumanname, who is working at Publicis as ${currentUser.business_title}.`;

    const response = await model.call(messages, options);
    logger.debug(response);
    assistantMessage.content = response.content.replace(/maskedhumanname/g, `${currentUser.first_name || 'user'}`);
    assistantMessage.options = response.options || {};
    messages.push(assistantMessage);
    if (response.usage) {
      const options: any = session.options;
      options.usage.total_tokens += response.usage.total_tokens;
      options.usage.prompt_tokens += response.usage.prompt_tokens;
      options.usage.completion_tokens += response.usage.completion_tokens;
      session.options = options;
    }
    await AppDataSource.getRepository(ChatMessageEntity).save(messages);
    session.messages = messages;
    await repo.save(session);
    result.data = session.toJSON();
    return result;
  }

  @Delete('/:id')
  @OpenAPI({ summary: 'Share or unshare a chat session identified by the session `id`' })
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
  @OpenAPI({ summary: 'Share or unshare a chat session identified by the session `id`' })
  @Authorized(['chat.write.self'])
  async updateChatSessionSharing(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
    @Req() req: RequestWithUser,
    @BodyParam('type') type_param: string,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const repo = AppDataSource.getRepository(ChatSessionEntity);

    const session = await repo.findOne({
      where: {
        id,
      },
    });
    if (!session) return new HttpError(404);

    if (session.userid !== currentUser.email) {
      if (!req.permissions.includes('chat.write.admin')) {
        return new HttpError(403, 'Insufficient permissions.');
      }
    }

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
    await repo.update(session.id, {
      type: newtype,
      updatedAt: () => '"updatedAt"',
    });
    // if (newtype === 'public') {
    //   try {
    //     const hasTokens = await checkADTokens(currentUser);
    //     const adtokens = JSON.parse(currentUser.adtokens);
    //     console.log(adtokens);
    //     if (hasTokens) {
    //       axios
    //         .post(
    //           `https://graph.microsoft.com/v1.0/teams/${process.env.TEAMID}/channels/${process.env.TEAMCHANNEL}/messages`,
    //           {
    //             body: {
    //               content: 'share test',
    //             },
    //           },
    //           {
    //             headers: {
    //               Authorization: `Bearer ${adtokens.access_token}`,
    //             },
    //           },
    //         )
    //         .then(ar => {
    //           console.log(ar.status);
    //           console.log(ar.data);
    //         })
    //         .catch(ex => console.error(ex));
    //     }
    //   } catch (ex) {
    //     logger.error(JSON.stringify(ex));
    //   }
    // }
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
