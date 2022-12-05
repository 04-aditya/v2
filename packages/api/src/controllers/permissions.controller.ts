import { APIResponse, IPermission, IUserRole } from '@/../../shared/types/src';
import { AppDataSource } from '@/databases';
import { PermissionEntity } from '@/entities/permission.entity';
import { UserEntity } from '@/entities/user.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import { JsonController, UseBefore, Get, Authorized, Post, Body, CurrentUser, Delete, Param, QueryParam } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { In } from 'typeorm';

@JsonController('/api/permissions')
@UseBefore(authMiddleware)
export class PermissionsController {
  @Get('/')
  @OpenAPI({ summary: 'Return permissions matched by the query`' })
  @Authorized(['admin'])
  async listPermissions(@CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<IPermission[]>();
    const matchedPerms = await AppDataSource.getRepository(PermissionEntity).find();
    logger.info(`fetched ${matchedPerms.length} permissions.`);
    result.data = matchedPerms.map(p => p.toJSON());

    return result;
  }

  @Post('/')
  @OpenAPI({ summary: 'Create a new permission`' })
  @Authorized(['admin'])
  async upsertPermission(@Body() data: IPermission) {
    const result = new APIResponse<IPermission>();
    let permission: PermissionEntity;
    if (data.id === -1) {
      permission = new PermissionEntity();
      permission.name = data.name;
      permission.description = data.description;
    } else {
      permission = await AppDataSource.getRepository(PermissionEntity).findOne({
        where: { id: data.id },
      });

      if (permission === null) {
        throw new HttpException(400, 'Invalid permission to update');
      }
      if (data.name) permission.name = data.name;
      if (data.description) permission.description = data.description;
    }
    await permission.save();
    result.data = permission.toJSON();

    return result;
  }

  @Delete('/')
  @Authorized(['admin'])
  @OpenAPI({ summary: 'Delete a set of permissions permission' })
  async deletePermission(@QueryParam('ids') ids: string) {
    const permsRepo = AppDataSource.getRepository(PermissionEntity);

    const idlist = ids.split(',').map(v => parseInt(v));
    const perms = await permsRepo.find({ where: { id: In(idlist) } });

    await permsRepo.remove(perms);

    return { data: ids, message: 'deleted' };
  }
}
