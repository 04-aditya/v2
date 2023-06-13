/* eslint-disable @typescript-eslint/no-inferrable-types */
import { APIResponse, IChatSession, IChatMessage, IChatModel, IChatContext, IChatCommand } from '@sharedtypes';
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
  UploadedFile,
  ForbiddenError,
} from 'routing-controllers';
import { Not, MoreThan, Equal, And } from 'typeorm';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { ChatSessionEntity } from '@/entities/chatsession.entity';
import { ChatMessageEntity } from '@/entities/chatmessage.entity';
import { UserDataEntity } from '@/entities/userdata.entity';
import ModelFactory from '@/models/model_factory';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { checkADTokens } from './auth.controller';
import crypto from 'crypto';
import AsyncTask, { updateFn } from '@/utils/asyncTask';
import { BlobServiceClient } from '@azure/storage-blob';
import { BingAPI } from '@/models/tools/BingAPI';
import { SlidingCounter } from '@/utils/redisInstance';
import { JSONSchema } from 'class-validator-jsonschema';

@JsonController('/api/chat')
@UseBefore(authMiddleware)
export class ChatController {
  static readonly CHATFAVOURITEKEY = 'chatfavourite';
  @Get('/models')
  @OpenAPI({
    summary: 'Returns a available LLM models for the current user',
    responses: {
      200: {
        description: `Returns a array of the LLM models for the current user,
        \nexample:\n\n
        {
          data: [
            {
              "id": "gpt35turbo",
              "name": "GPT 3.5 Turbo",
              "group": "Standard",
              "enabled": true,
              tokencontextlength: 4097,
            },
            {
              name: 'modelid2',
              group: 'groupname',
              enabled: true,
              tokencontextlength: 4097,
            },
          ],
        }`,
      },
      403: { description: 'Unauthorized' },
    },
  })
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

  @Get('/models/:modelid/contexts')
  @OpenAPI({
    summary: 'get chat contexts for the specified model',
    responses: {
      200: {
        description: `array of contexts available for the given modelid.
        \nexample\n\n
        {
          data:[{
            "id": "data_coe_f3b54921_db1d_48b4_ad77_f43b126a4e4c",
            "name": "Data CoE Confluence content",
            "description": "Use this tool for any information about Data CoE Community Center of Excellence, Partnerships with companies, Competencies for Data Analytics, Engineering and Data Science, Sudhan Sudharsan",
            "enabled": true
          }],
        }
        `,
      },
      403: {
        description: 'Unauthorized',
      }
    },
  })
  async getContext(@Param('modelid') modelId) {
    const result = new APIResponse<IChatContext[]>();
    try {
      const model = (await ModelFactory.models()).get(modelId);
      model.refresh && model.refresh();
      result.data = model.contexts;
    } catch (ex) {
      console.log(ex);
      logger.error(JSON.stringify(ex));
      throw new HttpError(500);
    }
    return result;
  }

  // @Post('/models/:modelid/contexts')
  // @OpenAPI({ summary: 'Create a new chat context for the specified model' })
  // async createContext(
  //   @Param('modelid') modelid: string,
  //   @CurrentUser() currentUser,
  //   @BodyParam('name') name: string,
  //   @BodyParam('description') description?: string,
  // ) {
  //   const result = new APIResponse<IChatContext>();
  //   if (modelid !== 'psbodhi') throw new HttpException(400, `Model ${modelid} not supported.`);
  //   try {
  //     const newcontext = {
  //       id: `${modelid}-${name}-${crypto.randomBytes(6).toString('hex')}`,
  //       name,
  //       description,
  //       enabled: true,
  //       metadata: JSON.stringify({
  //         userid: currentUser.id,
  //       }),
  //     };

  //     const ar = await axios.post(`${process.env['PSBODHI_URL']}/contexts`, newcontext, {
  //       headers: {
  //         'access-token': process.env['PSBODHI_KEY'],
  //         'Content-Type': 'application/json',
  //       },
  //       timeout: 60000,
  //     });

  //     result.data = ar.data;
  //   } catch (ex) {
  //     console.log(ex);
  //     logger.error(JSON.stringify(ex));
  //     throw new HttpError(500);
  //   }
  //   return result;
  // }

  @Get('/commands')
  @OpenAPI({ summary: 'Return the chat commands for the current user' })
  async getCommands(@CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');
    const result = new APIResponse<IChatCommand[]>();
    try {
      result.data = [
        // {
        //   name: 'actas',
        //   description: 'Select a system message for the query',
        //   options: {
        //     example: '/actas:gpt35turbo',
        //     choices: [],
        //   },
        // },
        {
          name: 'model',
          description: 'Select a model to use for the query',
          options: {
            example: '/model:gpt35turbo',
            choices: [...(await ModelFactory.models()).values()].filter(m => m.enabled).map(m => ({ id: m.id, name: m.name })),
          },
        },
        // {
        //   name: 'site',
        //   description: 'Search the site and use it as context to the query',
        //   options: {
        //     example: '/site:publicissapient.com',
        //   },
        // },
        {
          name: 'web',
          description: 'Search the web/site, use top N results as context to the query',
          options: {
            example: '/web:5,publicissapient.com',
          },
        },
        {
          name: 'temperature',
          description: 'set the temparature for this query. between 0-2.',
          options: {
            example: '/temperature:0.5',
          },
        },
      ];
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

  @Get('/files')
  @OpenAPI({ summary: 'Get the files generated or uploaded by the user in the chat' })
  @Authorized(['chat.read'])
  async getChatFiles(
    @QueryParam('type') fileType: 'images' | 'file',
    @CurrentUser() currentUser: UserEntity,
    @QueryParam('offset') offset = 0,
    @QueryParam('limit') limit = 10,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZCONNSTR;

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      logger.error('Azure Storage Connection string not found');
    }

    // Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZUPLOADCONTAINER);

    const result = new APIResponse<Array<{ name: string; url: string; timestamp: Date; metadata: Record<string, any> }>>([]);
    // for await (const response of containerClient.listBlobsFlat().byPage({ maxPageSize: 20 })) {
    //   for (const blob of response.segment.blobItems) {
    // List the blob(s) in the container.
    for await (const blob of containerClient.listBlobsFlat({ prefix: `${currentUser.id}/${fileType}` })) {
      // Get Blob Client from name, to get the URL
      const tempBlockBlobClient = containerClient.getBlockBlobClient(blob.name);

      // Display blob name and URL
      logger.debug(`\n\tname: ${blob.name}\n\tURL: ${tempBlockBlobClient.url}\n`);
      const props = await tempBlockBlobClient.getProperties();
      // logger.debug(props);
      const name = decodeURI(tempBlockBlobClient.url.replace(process.env.AZUPLOADHOST + `${currentUser.id}/${fileType}/`, ''));
      const url = tempBlockBlobClient.url.replace(process.env.AZUPLOADHOST, `${process.env.APIROOT}/api/data/file?n=`);
      result.data.push({
        name,
        url,
        timestamp: props.lastModified,
        metadata: {
          createdOn: props.createdOn,
          expiresOn: props.expiresOn,
          ...props.metadata,
        },
      });
    }
    return result;
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
    @BodyParam('async') async_param?: boolean,
    // @BodyParam('model') model_param?: string,
    // @BodyParam('assistant') assistant_param?: string,
    // @BodyParam('contexts') contexts_param?: string[],
    // @BodyParam('parameters') parameters?: Record<string, any>,
    @BodyParam('options') options?: Record<string, any>,
  ) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

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

    // if message is not present and session id is specified updated the attributes and return
    if (!message_param && sessionid_param) {
      await repo.save(session);
      logger.debug(`updated chat session: ${session.id}}`);
      const result = new APIResponse<IChatSession>();
      result.data = session.toJSON();
      return result;
    }

    const modelid = (options.model || (sessionid_param ? session.options.model : 'gpt35turbo')) as string;

    const slkey = `${currentUser.id}.${modelid}.count`;
    await SlidingCounter.increment(slkey, 3600);
    const slcount = await SlidingCounter.count(slkey);

    if (slcount > 25) {
      throw new HttpError(429, 'Too many requests. Limit 25 per hour.');
    }

    //if session is is not specified create a new session
    if (!sessionid_param) {
      session.name = name_param || message.substring(0, 45);
      session.userid = currentUser.email;
      session.messages = [];
    }

    const model = (await ModelFactory.models()).get(modelid);
    const contexts = options.contexts || (sessionid_param ? session.options.contexts : []);
    session.options = { ...session.options, model: modelid, contexts };
    session.options.usage = session.options.usage ?? { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
    session.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
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
      systemMessage.content = options.assistant || 'You are a helpful assistant.';
      systemMessage.index = 0;
      messages.push(systemMessage);
    }

    const newMessage = new ChatMessageEntity();
    newMessage.content = message;
    newMessage.role = 'user';
    newMessage.index = messages.length;
    newMessage.options = { model: modelid, contexts, web: options.web };
    messages.push(newMessage);

    const calloptions: Record<string, any> = {
      n: 1,
      stream: false,
      sessionid: session.id,
      contexts,
      ...(options.parameters || {}),
      user: currentUser,
      web: options.web,
    };

    const inputMessages = messages.map(m => m.toJSON());
    inputMessages[0].content += `\n\nCurrent date: ${new Date().toLocaleDateString()}.\n`;
    logger.debug(inputMessages[0].content);
    logger.debug(`Starting processing User data`);
    if (async_param) {
      const qt = new AsyncTask(updater => this.callModel(updater, model, messages, calloptions, session), req.user.id);
      return new APIResponse<IChatSession>(null, 'created', qt.id);
    }

    const apires: APIResponse<IChatSession> = await this.callModel(null, model, messages, calloptions, session);
    return apires;
  }

  private async callModel(
    updater: updateFn | null,
    model: IChatModel,
    messages: ChatMessageEntity[],
    options: Record<string, any>,
    session: ChatSessionEntity,
  ) {
    const modelInput = {
      input: messages.map(m => ({ role: m.role, content: m.content })),
      options,
    };
    const userQuery = modelInput.input[modelInput.input.length - 1].content;
    let intermediate_content: string | undefined;
    if (options.web) {
      const bing = new BingAPI(process.env.BINGSERPAPI_API_KEY, {
        answerCount: '3', //webpages, images, videos, and relatedSearches
        count: options.web.count || 5, //
        promote: 'Webpages',
        responseFilter: 'Webpages',
        safeSearch: 'Strict',
      });
      let newMessageContent = 'Web search results:\n\n';
      let q = options.web.query || userQuery;
      if (options.web.site) {
        q += ` site:${options.web.site}`;
      }
      const searchResults = await bing.call(q);
      newMessageContent += searchResults;

      intermediate_content = newMessageContent + '\n\n';
      newMessageContent +=
        `\n\nInstructions: Using the provided web search results, write a comprehensive reply to the given query. Make sure to cite results using [[number](URL)] notation after the reference. If the provided search results refer to multiple subjects with the same name, write separate answers for each subject.` +
        `\n\nQuery: ` +
        userQuery;
      modelInput.input[modelInput.input.length - 1].content = newMessageContent;
      console.log(modelInput);
    }
    const response = await model.call(modelInput);
    logger.debug(response);

    const assistantMessage = new ChatMessageEntity();
    assistantMessage.role = 'assistant';
    assistantMessage.index = messages.length;
    assistantMessage.content = response.content.replace(/maskedhumanname/g, `${options.user.first_name || 'user'}`);
    assistantMessage.options = response.options || {};
    assistantMessage.options.intermediate_content = assistantMessage.options.intermediate_content
      ? assistantMessage.options.intermediate_content + '\n\n' + intermediate_content || ''
      : intermediate_content;
    messages.push(assistantMessage);
    const soptions: any = session.options;
    if (response.usage) {
      soptions.usage.total_tokens += response.usage.total_tokens;
      soptions.usage.prompt_tokens += response.usage.prompt_tokens;
      soptions.usage.completion_tokens += response.usage.completion_tokens;
    }
    session.options = soptions;
    await AppDataSource.getRepository(ChatMessageEntity).save(messages);
    session.messages = messages;
    await AppDataSource.getRepository(ChatSessionEntity).save(session);
    const result = new APIResponse<IChatSession>(session.toJSON(), 'done');
    return result;
  }

  @Post('/upload')
  @OpenAPI({
    summary: 'Upload  file that can used as context in chats.',
  })
  async uploadFile(@UploadedFile('file') file: any, @Req() req: RequestWithUser) {
    const writePermissions = req.permissions.filter(p => p.startsWith('user.write.group.custom'));
    if (writePermissions.length === 0) throw new ForbiddenError('Insufficient permissions.');

    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZCONNSTR;

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      logger.error('Azure Storage Connection string not found');
    }

    // Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZUPLOADCONTAINER);

    // Create a unique name for the blob
    const blobName = `${req.user.id}/file/${file.originalname || file.name}`;

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Display blob name and url
    logger.info(`\nUploading Chat file to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`);

    const rwurl = blockBlobClient.url.toLowerCase().replace(process.env.AZUPLOADHOST, `${process.env.APIROOT}/api/data/file?n=`);
    // Upload data to the blob
    const uploadBlobResponse = await blockBlobClient.uploadData(file.buffer);
    logger.debug(`Starting processing chat file: ${rwurl}`);
    const qt = new AsyncTask(updater => this.processFileData(updater, file.buffer, rwurl, req.user), req.user.id);
    return { qid: qt.id, message: 'created', fileurl: rwurl };
  }

  private async processFileData(updater: updateFn, buffer: Buffer, filePath: string, currentuser: UserEntity) {
    logger.debug(`finished processing chat file: ${filePath}`);
    return new APIResponse<string>(filePath, 'done');
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
    if (newtype === 'public') {
      try {
        const hasTokens = await checkADTokens(currentUser);
        const adtokens = JSON.parse(currentUser.adtokens);
        console.log(adtokens);
        if (hasTokens) {
          axios
            .post(
              `https://graph.microsoft.com/v1.0/teams/${process.env.TEAMID}/channels/${process.env.TEAMCHANNEL}/messages`,
              {
                body: {
                  content: 'share test',
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${adtokens.access_token}`,
                },
              },
            )
            .then(ar => {
              console.log(ar.status);
              console.log(ar.data);
            })
            .catch(ex => console.error(ex));
        }
      } catch (ex) {
        logger.error(JSON.stringify(ex));
      }
    }
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
