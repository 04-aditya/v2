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
  Req,
  HttpError,
  ForbiddenError,
  BodyParam,
  UploadedFiles,
  NotFoundError,
  UploadedFile,
  QueryParam,
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { IUser, APIResponse, IPermission, IUserPAT } from 'sharedtypes';
import authMiddleware from '@/middlewares/auth.middleware';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { UserPATEntity } from '@/entities/userpat.entity';
import { format, parse as parseDate, parseJSON, intervalToDuration, parseISO } from 'date-fns';
import { logger } from '@/utils/logger';
import { LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { groupBy } from '@/utils/util';
import { UserDataEntity } from '@/entities/userdata.entity';
import { resolve } from 'path';

@JsonController('/api/users')
@UseBefore(authMiddleware)
export class UsersController {
  private async getUser(id: string, currentUser: UserEntity): Promise<UserEntity> {
    if (id === 'me') return currentUser;
    return UserEntity.getUserById(id);
  }

  @Get('/snapshotdates')
  @OpenAPI({ summary: 'Return unique snapshot dates of the main user data' })
  @Authorized(['user.read'])
  async getUserSnapshotDates() {
    const result = new APIResponse<Date[]>();
    const dates = await UserEntity.getSnapshots();
    result.data = dates;
    return result;
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Return user matched by the `id`' })
  @Authorized(['user.read'])
  async getUserById(@Param('id') userId: string, @CurrentUser() currentUser?: UserEntity) {
    const result = new APIResponse<IUser>();
    if (userId === '-1') return result;
    const matchedUser = await this.getUser(userId, currentUser);
    if (matchedUser.id !== currentUser.id) {
      if (!currentUser.hasRoleOrPermission(['admin'])) throw new HttpError(403);
    }
    result.data = matchedUser.toJSON();
    return result;
  }

  @Get('/:id/team')
  @OpenAPI({ summary: 'Return teams of the user matched by the `id` on give snapshot_date`' })
  @Authorized(['user.read.org'])
  async getUserTeamById(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
    @QueryParam('snapshot_date') snapshot_date?: string,
    @CurrentUser() currentUser?: UserEntity,
  ) {
    const result = new APIResponse<IUser[]>();
    if (userId === '-1') return result;
    const matchedUser = await this.getUser(userId, currentUser);
    const dates = await UserEntity.getSnapshots();
    let reqdate: Date = dates[0];
    try {
      if (snapshot_date) {
        if (snapshot_date.toLowerCase() !== 'last') {
          reqdate = parseJSON(snapshot_date);
        }
      }
    } catch (ex) {
      logger.error(`Bad snapshot_date: ${JSON.stringify(ex)}`);
      throw new HttpError(400, `Bad snapshot_date`);
    }
    const teamMembers = await matchedUser.loadOrg(reqdate);
    // if (depth === 'all') {
    //   teamMembers = await AppDataSource.getTreeRepository(UserEntity).findDescendants(matchedUser);
    // } else {
    //   const depthLevel = depth ? parseInt(depth) : 1;
    //   const userWithReportees = await AppDataSource.getTreeRepository(UserEntity).findDescendantsTree(matchedUser, { depth: depthLevel });
    //   const makeFlat = (user: UserEntity) => {
    //     user.reportees.forEach(r => {
    //       teamMembers.push(r);
    //       makeFlat(r);
    //     });
    //   };
    //   makeFlat(userWithReportees);
    // }
    // if (matchedUser.id !== currentUser.id) {
    //   if (!currentUser.hasRoleOrPermission(['admin'])) throw new HttpError(403);
    // }

    result.data = teamMembers.map(u => u.toJSON());
    return result;
  }

  @Get('/:id/stats')
  @OpenAPI({ summary: 'Return stats of the user matched by the `id`' })
  @Authorized(['user.read'])
  async getUserStatsById(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
    @QueryParam('snapshot_date') snapshot_date?: string,
    @CurrentUser() currentUser?: UserEntity,
  ) {
    const result = new APIResponse<{ name: string; value: any; all?: any; capability?: any; industry?: any; account?: any; craft?: any }[]>();
    if (userId === '-1') return [];
    const matchedUser = await this.getUser(userId, currentUser);
    const dates = await UserEntity.getSnapshots();
    if (dates.length === 0) return result;
    let reqdate: Date = dates[0];
    try {
      if (snapshot_date) {
        if (snapshot_date.toLowerCase() !== 'last') {
          reqdate = new Date(snapshot_date);
        }
      }
    } catch (ex) {
      logger.error(`Bad snapshot_date: ${JSON.stringify(ex)}`);
      throw new HttpError(400, `Bad snapshot_date`);
    }
    const orgUsers = await matchedUser.loadOrg(reqdate);
    if (!UserEntity.canRead(currentUser, matchedUser, orgUsers, req.permissions)) throw new HttpError(403);

    try {
      const dataworkers = orgUsers.map(u => {
        return new Promise(resolve => {
          if (u.snapshot_date.getTime() === reqdate.getTime()) return resolve(u);

          UserEntity.getUserData(u.id, reqdate).then(data => {
            UserEntity.merge(u, data);
            resolve(u);
          });
        });
      });
      await Promise.all(dataworkers);
      const pdastats = await UserEntity.getPDAStats(reqdate);
      const orgStats = UserEntity.calculatePDAStats(orgUsers);
      const cpStats = pdastats.capability[matchedUser.capability || 'N/A'] || {};
      const cfStats = pdastats.craft[matchedUser.craft || 'N/A'] || {};
      const accountStats = pdastats.account[matchedUser.account || 'N/A'] || {};
      const teamStats = pdastats.team[matchedUser.team || 'N/A'] || {};
      result.data = [];

      result.data.push({
        name: 'Directs',
        value: orgUsers.filter(u => u.supervisor_id === matchedUser.oid).length,
        all: pdastats.all.totalCount,
        capability: cpStats.totalCount,
        industry: teamStats.totalCount,
        account: accountStats.totalCount,
        craft: cfStats.totalCount,
      });
      result.data.push({
        name: 'Leverage',
        value: orgStats.cs_map,
        all: pdastats.all.cs_map,
        capability: cpStats.cs_map,
        industry: teamStats.cs_map,
        account: accountStats.cs_map,
        craft: cfStats.cs_map,
      });
      result.data.push({
        name: 'Total Count',
        value: orgStats.totalCount,
        all: pdastats.all.totalCount,
        capability: cpStats.totalCount,
        industry: teamStats.totalCount,
        account: accountStats.totalCount,
        craft: cfStats.totalCount,
      });
      result.data.push({
        name: 'FTE %',
        value: orgStats.fteCount / orgUsers.length,
        all: pdastats.all.fteCount / pdastats.all.totalCount,
        capability: cpStats.fteCount / cpStats.totalCount,
        industry: teamStats.fteCount / teamStats.totalCount,
        account: accountStats.fteCount / accountStats.totalCount,
        craft: cfStats.fteCount / cfStats.totalCount,
      });
      result.data.push({
        name: 'Diversity %',
        value: orgStats.diversityCount / orgUsers.length,
        all: pdastats.all.diversityCount / pdastats.all.totalCount,
        capability: cpStats.diversityCount / cpStats.totalCount,
        industry: teamStats.diversityCount / teamStats.totalCount,
        account: accountStats.diversityCount / accountStats.totalCount,
        craft: cfStats.diversityCount / cfStats.totalCount,
      });
      result.data.push({
        name: 'PS Exp',
        value: orgStats.totalExp / orgUsers.length,
        all: pdastats.all.totalExp / pdastats.all.totalCount,
        capability: cpStats.totalExp / cpStats.totalCount,
        industry: teamStats.totalExp / teamStats.totalCount,
        account: accountStats.totalExp / accountStats.totalCount,
        craft: cfStats.totalExp / cfStats.totalCount,
      });
      result.data.push({
        name: 'TiT Exp',
        value: orgStats.titleExp / orgUsers.length,
        all: pdastats.all.titleExp / pdastats.all.totalCount,
        capability: cpStats.titleExp / cpStats.totalCount,
        industry: teamStats.titleExp / teamStats.totalCount,
        account: accountStats.titleExp / accountStats.totalCount,
        craft: cfStats.titleExp / cfStats.totalCount,
      });
      return result;
    } catch (ex) {
      console.error(ex);
      throw ex;
    }
  }

  @Get('/:id/permissions')
  @OpenAPI({ summary: 'Return permissions of the user matched by the `id`' })
  @Authorized(['permissions.read'])
  async getUserPermissionsById(@Param('id') userId: string, @CurrentUser() currentUser?: UserEntity) {
    try {
      const result = new APIResponse<IPermission[]>();
      const perms = new Array<IPermission>();
      let matchedUser: UserEntity;
      if (userId !== 'me') {
        if (!currentUser.hasRoleOrPermission(['admin'])) throw new HttpError(403);
        matchedUser = await UserEntity.getUserById(userId);
      } else {
        matchedUser = currentUser;
      }
      (await matchedUser.getAllPermissions()).forEach(p => {
        perms.push(p);
      });
      result.data = perms;
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  @Get('/:id/pat')
  @OpenAPI({ summary: 'Get personal access tokens for the user matched by the `id`' })
  @Authorized(['user.read'])
  async getPATs(@Param('id') userId: string, @Req() request: RequestWithUser, @CurrentUser() currentUser?: UserEntity) {
    try {
      console.log(request.permissions);
      const result = new APIResponse<IUserPAT[]>();
      let matchedUser: UserEntity;
      if (userId !== 'me') {
        let hasAccess = false;
        if (request.permissions.includes('user.read.all')) {
          hasAccess = true;
        }
        if (!hasAccess) {
          throw new ForbiddenError();
        }
        matchedUser = await UserEntity.getUserById(userId);
      } else {
        matchedUser = currentUser;
      }
      matchedUser = await AppDataSource.getRepository(UserEntity).findOne({
        where: {
          id: matchedUser.id,
        },
        relations: {
          pats: true,
        },
      });
      result.data = matchedUser.pats.map(p => p.toJSON());
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  @Delete('/:id/pat/:patID')
  @OpenAPI({ summary: 'Delete an exsisting personal access token identified by `name` for the user matched by the `id` ' })
  async deletePAT(@Param('id') userId: string, @Param('patID') patID: string, @CurrentUser() currentUser?: UserEntity) {
    try {
      const matchedUser = await AppDataSource.getRepository(UserEntity).findOne({
        where: {
          id: userId === 'me' ? currentUser.id : parseInt(userId),
        },
        relations: {
          pats: true,
        },
      });
      if (!matchedUser) throw new NotFoundError();

      const matchedPat = matchedUser.pats.find(p => p.id === patID);
      if (!matchedPat) throw new NotFoundError();

      await AppDataSource.getRepository(UserPATEntity).remove(matchedPat);
      return { message: 'success' };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  @Post('/:id/pat')
  @OpenAPI({ summary: 'Create a new personal access token for the user matched by the `id`' })
  async createPAT(@Param('id') userId: string, @Body() data: IUserPAT, @CurrentUser() currentUser?: UserEntity) {
    try {
      const result = new APIResponse<IUserPAT>();
      let matchedUser: UserEntity;
      if (userId !== 'me') {
        // matchedUser = await UserEntity.getUserById(userId);
        throw new ForbiddenError();
      } else {
        matchedUser = currentUser;
      }
      console.log(data);
      let pat = new UserPATEntity();
      pat.name = data.name;
      pat.expiration = data.expiration;
      pat.permissions = data.permissions;
      pat.user = matchedUser;
      pat.token = 'na';
      pat = await AppDataSource.getRepository(UserPATEntity).save(pat);
      pat.token = matchedUser.createAccessToken(pat.expiration, pat.id);
      pat = await AppDataSource.getRepository(UserPATEntity).save(pat);
      result.data = pat.toJSON();
      result.data.token = pat.token;
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
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
