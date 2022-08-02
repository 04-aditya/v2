import { Controller, Param, Body, Get, Post, Put, Delete, HttpCode, UseBefore, JsonController, Authorized, CurrentUser } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { validationMiddleware } from '@middlewares/validation.middleware';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entiies/user.entity';
import { IUser, APIResponse } from 'sharedtypes';
import authMiddleware from '@/middlewares/auth.middleware';

@JsonController('/users')
@UseBefore(authMiddleware)
export class UsersController {
  @Get('/:id')
  @OpenAPI({ summary: 'Return user matched by the `id`' })
  async getUserById(@Param('id') userId: string, @CurrentUser() currentUser?: UserEntity) {
    const result = new APIResponse<IUser>();
    if (userId !== 'me') {
      const matchedUser = await AppDataSource.getRepository(UserEntity).findOne({
        where: {
          id: parseInt(userId),
        },
      });
      result.data = matchedUser;
    } else {
      result.data = currentUser;
    }
    return result;
  }

  // @Post('/users')
  // @HttpCode(201)
  // @UseBefore(validationMiddleware(CreateUserDto, 'body'))
  // @OpenAPI({ summary: 'Create a new user' })
  // async createUser(@Body() userData: CreateUserDto) {
  //   const createUserData: User = await this.userService.createUser(userData);
  //   return { data: createUserData, message: 'created' };
  // }

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
