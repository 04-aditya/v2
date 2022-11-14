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
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { IUser, APIResponse } from 'sharedtypes';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import AsyncTask from '@/utils/asyncTask';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { CLID, CLIS, TID } from '@/config';

const pdaclient = axios.create({
  baseURL: 'https://psdpanalyticsdev.azurewebsites.net/queryaascube/api',
  headers: {
    clid: CLID,
    clis: CLIS,
    tid: TID,
  },
});
axiosRetry(pdaclient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    console.log(error);
    return true;
  },
});

@JsonController('/api/admin')
@UseBefore(authMiddleware)
export class AdminController {
  @Get('/users')
  @OpenAPI({ summary: 'Return users matched by the query`' })
  @Authorized(['admin'])
  async getUsers(@CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<IUser[]>();
    const matchedUsers = await AppDataSource.getRepository(UserEntity).find({ relations: { roles: true } });
    console.log(`fetched ${matchedUsers.length} users.`);
    result.data = matchedUsers.map(u => u.toJSON());

    return result;
  }

  @Post('/refreshuser/pda')
  @OpenAPI({ summary: 'Refresh users data from pda' })
  @Authorized(['admin'])
  async refreshUsers(@BodyParam('email') email: string, @CurrentUser() currentUser: UserEntity) {
    const refresh = async () => {
      const ar = await pdaclient.post('/getPerson/bySupervisor', {
        supervisorEmail: email,
      });

      if (ar.status !== 200) {
        throw new Error('Unable to find the record in PDA data');
      }

      let pdadata: any;
      if (ar.data) {
        (ar.data || []).forEach((emp: any) => {
          if (emp.email_address === email.toLowerCase()) {
            pdadata = emp;
            console.log(pdadata);
          }
        });
      }

      if (!pdadata) {
        throw new Error('Unable to find the record in PDA data');
      }
      const matchedUser = await AppDataSource.getRepository(UserEntity).findOne({ where: { email } });
      matchedUser.pdadata = JSON.stringify(pdadata);
      await matchedUser.save();
      return { snapshot_date: pdadata.snapshot_date };
    };

    const qt = new AsyncTask(refresh(), currentUser.id + '');
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
