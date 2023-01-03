import { APIResponse, IUserRole } from '@/../../shared/types/src';
import { AppDataSource } from '@/databases';
import { PermissionEntity } from '@/entities/permission.entity';
import { UserRoleEntity } from '@/entities/userrole.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import { JsonController, UseBefore, Get, Authorized, QueryParam, Post, Body } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { In } from 'typeorm';

@JsonController('/api/roles')
@UseBefore(authMiddleware)
export class RolesController {
  @Get('/')
  @OpenAPI({ summary: 'Return roles matched by the query`' })
  @Authorized(['roles.read.all'])
  async listRoles() {
    const result = new APIResponse<IUserRole[]>();
    const matchedRoles = await AppDataSource.getRepository(UserRoleEntity).find({
      relations: ['permissions'],
    });
    logger.info(`fetched ${matchedRoles.length} roles.`);
    result.data = matchedRoles.map(p => p.toJSON());
    return result;
  }

  @Post('/')
  @OpenAPI({ summary: 'Create a new role`' })
  @Authorized(['roles.write.all'])
  async upsertRole(@Body() data: IUserRole) {
    const rolesRepo = AppDataSource.getRepository(UserRoleEntity);
    const permRepo = AppDataSource.getRepository(PermissionEntity);

    const result = new APIResponse<IUserRole>();
    let role: UserRoleEntity;
    if (data.id === -1) {
      logger.info(`Creating new role: ${data.name}`);
      role = new UserRoleEntity();
      role.name = data.name;
      role.description = data.description;
    } else {
      logger.info(`Updating role: ${data.id}`);
      role = await rolesRepo.findOne({
        where: { id: data.id },
        relations: { permissions: true },
      });
      if (role === null) throw new HttpException(400, 'Invalid role to update');

      if (role.name !== data.name) {
        console.log(`changing name from ${role.name} to ${data.name}`);
        role.name = data.name;
      }

      if (role.description !== data.description) role.description = data.description;

      if (data.includedRoleNames) role.includedRoleNames = data.includedRoleNames;

      if (data.permissions) {
        role.permissions = await permRepo.find({
          where: { id: In(data.permissions.map(p => p.id)) },
        });
      }
    }
    await role.save();
    result.data = role.toJSON();

    return result;
  }
}
