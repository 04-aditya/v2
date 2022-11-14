import { Res, Param, Body, Get, Post, Put, Delete, HttpCode, UseBefore, JsonController, Authorized, CurrentUser } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { validationMiddleware } from '@middlewares/validation.middleware';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { IUser, APIResponse } from 'sharedtypes';
import authMiddleware from '@/middlewares/auth.middleware';
import cache from '@/utils/cache';
import { Response } from 'express';
import { logger } from '@/utils/logger';
import { HttpException } from '@/exceptions/HttpException';

@JsonController('/api/q')
export class QApiController {
  @Get('/:id')
  @OpenAPI({ summary: 'Return user matched by the `id`' })
  async getById(@Param('id') id: string, @CurrentUser() currentUser?: UserEntity) {
    const workrequestjson: any = await cache.get('qr-' + id);
    if (!workrequestjson) {
      throw new HttpException(404, 'invaild id');
    }
    const workrequest: any = JSON.parse(workrequestjson);
    if (workrequest.status === 'done' || workrequest.status === 'error') {
      setTimeout(async () => {
        await cache.del('qr-' + workrequest.id);
      }, 5000);
    }
    return workrequest;
  }
}
