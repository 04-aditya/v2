import { APIResponse, ConfigType, IConfigItem, IStatType } from '@/../../shared/types/src';
import { AppDataSource } from '@/databases';
import { ConfigEntity } from '@/entities/config.entity';
import { UserEntity } from '@/entities/user.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { JsonController, UseBefore, Get, Authorized, Post, Body, CurrentUser, Delete, BodyParam } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { In } from 'typeorm';

const openaiclient = axios.create({
  baseURL: `${process.env['AZ_OPENAI_URL']}openai/deployments/${process.env['AZ_OPENAI_DEPLOYMENT']}/chat/completions?api-version=${process.env['AZ_OPENAI_VERSION']}`,
  headers: {
    'api-key': process.env['AZ_OPENAI_KEY'],
  },
});
axiosRetry(openaiclient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    console.log(error);
    return true;
  },
});

type ChatMessage = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};
type ChatSession = {
  chatId: string;
  name: string;
  messages: Array<ChatMessage>;
  options?: {
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    max_tokens: number;
    stop?: string;
  };
};

@JsonController('/api/chat')
@UseBefore(authMiddleware)
export class ChatController {
  @Get('/history')
  @OpenAPI({ summary: 'Return the chat history of the current user' })
  async getChatHistory(@CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<ChatSession[]>();
    result.data = [];
    for (let i = 0; i < 20; i++) {
      const messages = [];
      result.data.push({
        chatId: `chat-${i}`,
        name: `Chat Name ${i}`,
        messages,
      });
    }

    return result;
  }
}
