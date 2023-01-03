import {
  Controller,
  Param,
  Body,
  Get,
  Post,
  Put,
  Delete,
  HttpCode,
  UseBefore,
  JsonController,
  Authorized,
  CurrentUser,
  BodyParam,
  QueryParam,
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { IUser, APIResponse, IPermission, IUserRole } from 'sharedtypes';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import AsyncTask from '@/utils/asyncTask';
import { PermissionEntity } from '@/entities/permission.entity';
import { UserRoleEntity } from '@/entities/userrole.entity';
import { logger } from '@/utils/logger';

@JsonController('/api/admin')
@UseBefore(authMiddleware)
export class AdminController {
  @Get('/users')
  @OpenAPI({ summary: 'Return users matched by the query`' })
  @Authorized(['user.read.all.all'])
  async listUsers(@CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<IUser[]>();
    const matchedUsers = await AppDataSource.getRepository(UserEntity).find({ relations: { roles: true } });
    console.log(`fetched ${matchedUsers.length} users.`);
    result.data = matchedUsers.map(u => u.toJSON());

    return result;
  }

  @Post('/refreshuser/pda')
  @OpenAPI({ summary: 'Refresh users data from pda' })
  @Authorized(['user.write.all.all'])
  async refreshUsers(@BodyParam('email') email: string, @CurrentUser() currentUser: UserEntity) {
    const qt = new AsyncTask(currentUser.refresh(), currentUser.id);
    return { data: qt.id, message: 'created' };
  }

  // @Put('/users/:id')
  // @UseBefore(validationMiddleware(CreateUserDto, 'body', true))
  // @OpenAPI({ summary: 'Update a user' })
  // async updateUser(@Param('id') userId: number, @Body() userData: CreateUserDto) {
  //   const updateUserData: User[] = await this.userService.updateUser(userId, userData);
  //   return { data: updateUserData, message: 'updated' };
  // }

  // @Delete('/users/:id')
  // @OpenAPI({ summary: 'Delete a user' })
  // async deleteUser(@Param('id') userId: number) {
  //   const deleteUserData: User[] = await this.userService.deleteUser(userId);
  //   return { data: deleteUserData, message: 'deleted' };
  // }
}
