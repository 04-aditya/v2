import { Param, Get, JsonController, CurrentUser } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { UserEntity } from '@/entities/user.entity';
import cache from '@/utils/cache';
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

    if (workrequestjson.userId !== currentUser.id) throw new HttpException(403, 'Forbiddened');

    const workrequest: any = JSON.parse(workrequestjson);
    if (workrequest.status === 'done' || workrequest.status === 'error') {
      setTimeout(async () => {
        await cache.del('qr-' + workrequest.id);
      }, 5000);
    }
    return workrequest;
  }
}
