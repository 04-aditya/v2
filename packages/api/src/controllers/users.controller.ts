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
import { format, parse as parseDate, intervalToDuration } from 'date-fns';
import { logger } from '@/utils/logger';
import { Not } from 'typeorm';

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
  @OpenAPI({ summary: 'Return teams of the user matched by the `id` depth specified by `depth`' })
  @Authorized(['user.read.org'])
  async getUserTeamById(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
    @QueryParam('depth') depth?: string,
    @CurrentUser() currentUser?: UserEntity,
  ) {
    const result = new APIResponse<IUser[]>();
    if (userId === '-1') return result;
    const matchedUser = await this.getUser(userId, currentUser);

    let teamMembers = await matchedUser.loadOrg();
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
    @QueryParam('snapshot_date') snapshot_date?: Date,
    @CurrentUser() currentUser?: UserEntity,
  ) {
    const result = new APIResponse<{ name: string; value: any; all?: any; capability?: any; industry?: any; account?: any }[]>();
    if (userId === '-1') return [];
    const matchedUser = await this.getUser(userId, currentUser);
    const dates = await UserEntity.getSnapshots();
    const reqdate = snapshot_date || dates[0];
    const orgUsers = await matchedUser.loadOrg();
    if (!UserEntity.canRead(currentUser, matchedUser, orgUsers, req.permissions)) throw new HttpError(403);

    const allUsers = await AppDataSource.getRepository(UserEntity).find({
      where: {
        snapshot_date: reqdate,
      },
      cache: 60000,
    }); //10 seconds cache
    const allCaUsers = allUsers.filter(u => u.capability === matchedUser.capability);
    const allIndustryUsers = allUsers.filter(u => u.team === matchedUser.team);
    const allAccountUsers = allUsers.filter(u => u.account === matchedUser.account);

    // console.log(matchedUser.reportees.length);
    // const users: Array<UserEntity> = [];

    function groupBy(list: UserEntity[], keyGetter: (u: UserEntity) => string) {
      const map = new Map();
      list.forEach(item => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
          map.set(key, [item]);
        } else {
          collection.push(item);
        }
      });
      return map;
    }

    function calculate(list: UserEntity[]) {
      let avgDirectsCount = 0;
      let fteCount = 0;
      let totalExp = 0;
      let titleExp = 0;
      let dCount = 0;
      const cs_map = groupBy(list, u => u.career_stage);
      const supervisor_map = groupBy(list, u => (u.supervisor_id ? u.supervisor_id + '' : ''));

      let mpcount = 0;
      for (const [key, value] of supervisor_map) {
        if (key !== 'null') {
          avgDirectsCount += value.length;
          mpcount++;
        }
      }

      avgDirectsCount = avgDirectsCount / mpcount;

      list.forEach(u => {
        if (u.employment_type === 'Fulltime') {
          fteCount++;
        }
        if (u.gender !== 'Male') {
          dCount++;
        }
        const expDuration = intervalToDuration({
          start: u.most_recent_hire_date,
          end: new Date(),
        });
        totalExp += expDuration.years + expDuration.months / 12;

        const titDuration = intervalToDuration({
          start: u.last_promotion_date || u.most_recent_hire_date,
          end: new Date(),
        });
        titleExp += titDuration.years + titDuration.months / 12;
      });
      return { cs_map, supervisor_map, avgDirectsCount, fteCount, totalExp, titleExp, dCount };
    }
    const myCounts = calculate(orgUsers);
    const industryCounts = calculate(allIndustryUsers);
    const accountCounts = calculate(allAccountUsers);
    const allCounts = calculate(allUsers);
    const caCounts = calculate(allCaUsers);

    result.data = [];

    result.data.push({
      name: 'Directs',
      value: orgUsers.filter(u => u.supervisor_id === matchedUser.oid).length,
      industry: industryCounts.avgDirectsCount,
      account: accountCounts.avgDirectsCount,
      all: allCounts.avgDirectsCount,
      capability: caCounts.avgDirectsCount,
    });
    result.data.push({
      name: 'Leverage',
      value: Array.from(myCounts.cs_map.entries()).map(([key, value]) => ({ name: key, value: value.length })),
      industry: industryCounts.avgDirectsCount,
      account: accountCounts.avgDirectsCount,
      all: allCounts.avgDirectsCount,
      capability: caCounts.avgDirectsCount,
    });
    result.data.push({
      name: 'Total Count',
      value: orgUsers.length,
      industry: allIndustryUsers.length,
      account: allAccountUsers.length,
      all: allUsers.length,
      capability: allCaUsers.length,
    });
    result.data.push({
      name: 'FTE %',
      value: myCounts.fteCount / orgUsers.length,
      industry: industryCounts.fteCount / allIndustryUsers.length,
      account: accountCounts.fteCount / allAccountUsers.length,
      all: allCounts.fteCount / allUsers.length,
      capability: caCounts.fteCount / allCaUsers.length,
    });
    result.data.push({
      name: 'Diversity %',
      value: myCounts.dCount / orgUsers.length,
      industry: industryCounts.dCount / allIndustryUsers.length,
      account: accountCounts.dCount / allAccountUsers.length,
      all: allCounts.dCount / allUsers.length,
      capability: caCounts.dCount / allCaUsers.length,
    });
    result.data.push({
      name: 'PS Exp',
      value: myCounts.totalExp / orgUsers.length,
      industry: industryCounts.totalExp / allIndustryUsers.length,
      account: accountCounts.totalExp / allAccountUsers.length,
      all: allCounts.totalExp / allUsers.length,
      capability: caCounts.totalExp / allCaUsers.length,
    });
    result.data.push({
      name: 'TiT Exp',
      value: myCounts.titleExp / orgUsers.length,
      industry: industryCounts.titleExp / allIndustryUsers.length,
      account: accountCounts.titleExp / allAccountUsers.length,
      all: allCounts.titleExp / allUsers.length,
      capability: caCounts.titleExp / allCaUsers.length,
    });
    return result;
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
