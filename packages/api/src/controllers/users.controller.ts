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
import { IUser, APIResponse, IPermission, IUserPAT, IUserData } from 'sharedtypes';
import authMiddleware from '@/middlewares/auth.middleware';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { UserPATEntity } from '@/entities/userpat.entity';
import { format, parse as parseDate, parseJSON, intervalToDuration, parseISO, isDate } from 'date-fns';
import { logger } from '@/utils/logger';
import { LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { groupBy } from '@/utils/util';
import { UserDataEntity } from '@/entities/userdata.entity';
import { BlobServiceClient, RestError } from '@azure/storage-blob';
import AsyncTask, { stringFn } from '@/utils/asyncTask';
import Excel from 'exceljs';
import { UserGroupEntity } from '@/entities/usergroup.entity';

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
  @Get('/datakeys')
  @OpenAPI({ summary: 'Get all allowed keys for user data' })
  async getDataKeys() {
    const result = new APIResponse<string[]>();
    result.data = await UserDataEntity.getCustomUserDataKeys();
    return result;
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Return user matched by the `id`' })
  @Authorized(['user.read'])
  async getUserById(@Param('id') userId: string, @Req() req: RequestWithUser) {
    const result = new APIResponse<IUser>();
    if (userId === '-1') return result;
    const currentUser = req.user;
    const matchedUser = await this.getUser(userId, currentUser);
    if (matchedUser.id !== currentUser.id) {
      const readPerms = req.permissions.filter(p => p.startsWith('user.read'));
      const canRead = await currentUser.canRead(matchedUser, readPerms);
      if (canRead === false) {
        logger.warn(`user ${currentUser.email} does not have permission to read user ${matchedUser.email}}`);
        throw new HttpError(403);
      }
    }
    result.data = matchedUser.toJSON();
    result.data.permissions = req.permissions;
    return result;
  }

  @Get('/:id/team')
  @OpenAPI({ summary: 'Return teams of the user matched by the `id` on give snapshot_date`' })
  @Authorized(['user.read.org'])
  async getUserTeamById(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    @QueryParam('usergroup') usergroup: string = 'org:Team',
    @QueryParam('custom_details') custom_details_keys?: string,
    @QueryParam('snapshot_date') snapshot_date?: string,
    @CurrentUser() currentUser?: UserEntity,
  ) {
    const result = new APIResponse<IUser[]>();
    if (userId === '-1') return result;
    const matchedUser = await this.getUser(userId, currentUser);
    if (!UserEntity.canRead(currentUser, matchedUser, req.permissions)) {
      throw new HttpError(403);
    }
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

    const groups = usergroup.split(',').map(g => g.trim());
    const { users: teamMembers } = await matchedUser.loadOrg(reqdate, groups);
    const custom_keys = (custom_details_keys || '').split(',').map(k => k.trim().toLowerCase());
    if (reqdate.getTime() !== dates[0].getTime()) {
      const dataworkers = teamMembers.map(u => {
        return new Promise(resolve => {
          if (u.snapshot_date.getTime() === reqdate.getTime()) return resolve(u);
          UserDataEntity.getUserData(u.id, reqdate).then(data => {
            UserEntity.merge(u, data);
            if (!custom_details_keys) return resolve(u);
            UserDataEntity.getUserData(u.id, reqdate, custom_keys).then(data => {
              u.custom_details = data;
              resolve(u);
            });
          });
        });
      });
      await Promise.all(dataworkers);
    } else if (custom_details_keys) {
      const dataworkers = teamMembers.map(u => {
        return new Promise(resolve => {
          UserDataEntity.getUserData(u.id, reqdate, custom_keys).then(data => {
            u.custom_details = data;
            resolve(u);
          });
        });
      });
      await Promise.all(dataworkers);
    }

    result.data = teamMembers.map(u => u.toJSON());
    return result;
  }

  @Get('/:id/teamdata')
  @OpenAPI({ summary: 'Return teams custom data of the user matched by the `id` on give snapshot_date`' })
  @Authorized(['user.read.org'])
  async getUserTeamDataById(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    @QueryParam('usergroup') usergroup: string = 'org:Team',
    @QueryParam('custom_details_keys') custom_details_keys?: string[],
    @QueryParam('snapshot_date') snapshot_date?: string,
    @CurrentUser() currentUser?: UserEntity,
  ) {
    const result = new APIResponse<IUser[]>();
    if (userId === '-1') return result;
    const matchedUser = await this.getUser(userId, currentUser);
    if (!UserEntity.canRead(currentUser, matchedUser, req.permissions)) {
      throw new HttpError(403);
    }
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
    const groups = usergroup.split(',').map(g => g.trim());
    const { users: teamMembers } = await matchedUser.loadOrg(reqdate, groups);
    if (reqdate.getTime() !== dates[0].getTime()) {
      const dataworkers = teamMembers.map(u => {
        return new Promise(resolve => {
          // if (u.snapshot_date.getTime() === reqdate.getTime()) return resolve(u);
          UserDataEntity.getUserData(u.id, reqdate).then(data => {
            UserEntity.merge(u, data);
            UserDataEntity.getUserData(u.id, reqdate, custom_details_keys).then(data => {
              u.custom_details = data;
              resolve(u);
            });
          });
        });
      });
      await Promise.all(dataworkers);
    }

    result.data = teamMembers.map(u => u.toJSON());
    return result;
  }

  @Post('/uploaddata')
  @OpenAPI({
    summary: 'Upload user data from a excel file.',
    description: `
Data from the excel file will be read from the first sheet.
The sheet should contain following mandatory columns.

* EMAIL_ADDRESS
* TIMESTAMP
* KEY
* VALUE

The sheet could also contain additional columns starting with \`VALUE_\` which will be used as additional values for the data.

Any additional columns will be ignored.

example:
\`\`\`csv
EMAIL_ADDRESS,       TIMESTAMP,                KEY,   VALUE, VALUE_section1, VALUE_section2
someone@example.com, 2023/01/01 10:10:00.000z, score, 90,   50,             40
\`\`\`
`,
  })
  @Authorized(['user.write'])
  async uploadData(@UploadedFile('file') file: any, @Req() req: RequestWithUser) {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZCONNSTR;

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      logger.error('Azure Storage Connection string not found');
    }

    // Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZUPLOADCONTAINER);

    // Create a unique name for the blob
    const blobName = `${req.user.id}/data/${file.originalname}`;

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Display blob name and url
    logger.info(`\nUploading to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`);

    // Upload data to the blob
    const uploadBlobResponse = await blockBlobClient.uploadData(file.buffer);
    logger.debug(`Blob was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`);
    logger.debug(`Starting processing User data`);
    const qt = new AsyncTask(updater => this.processFileData(updater, file.buffer, req.permissions, req.user), req.user.id);
    return { qid: qt.id, message: 'created' };
  }

  async processFileData(updater: stringFn, buffer: Buffer, permissions: string[], currentuser: UserEntity) {
    try {
      // load from buffer
      const workbook: any = new Excel.Workbook();
      await workbook.xlsx.load(buffer);

      // access by `worksheets` array:
      //get the first worksheet from workbook
      const worksheet = workbook.worksheets[0];

      const headerRow: any = worksheet.getRow(1);
      const columns = headerRow.values.map(h => h.trim().toUpperCase().replace(/ /g, '_'));

      const headers = {
        oid: columns.indexOf('ORACLE_ID') || columns.indexOf('OID'),
        csid: columns.indexOf('CAREER_SETTINGS_ID') || columns.indexOf('CSID'),
        email: columns.indexOf('EMAIL_ADDRESS') || columns.indexOf('EMAIL'),
        timestamp: columns.indexOf('TIMESTAMP') || columns.indexOf('DATE'),
        key: columns.indexOf('KEY'),
        value: columns.indexOf('VALUE'),
        details: columns.filter(c => c.startsWith('VALUE_')).map(c => ({ key: c.replace('VALUE_', ''), index: columns.indexOf(c) })),
      };
      logger.debug(JSON.stringify(headers));
      logger.info(`File contains: ${worksheet.rowCount} rows`);
      updater(`processing: ${worksheet.rowCount} rows of user data`);
      const { users: teamMembers } = await currentuser.loadOrg(currentuser.snapshot_date);
      let updatedCount = 0;
      const errors: string[] = [];
      for await (const values of this.getUserDataValues(worksheet, headers)) {
        try {
          updatedCount++;
          const user = await UserEntity.CreateUser(values.email);
          if (!UserEntity.canWrite(currentuser, user, permissions, teamMembers)) {
            const error_message = `User ${currentuser.email} does not have permission to write data for ${values.email}`;
            logger.info(error_message);
            errors.push(error_message);
            continue;
          }
          const data = await UserDataEntity.Add(user.id, 'c-' + values.key, values.value, values.timestamp);
          if (updatedCount === 1) {
            logger.debug(JSON.stringify(data.toJSON()));
          }
        } catch (ex) {
          logger.error(JSON.stringify(ex));
          logger.error(JSON.stringify(values, null, 2));
        }
      }
      logger.info(`Finished processing ${updatedCount} rows`);
      return { count: updatedCount, message: `Finished processing ${updatedCount} rows.`, errors: errors.join('\n') };
    } catch (error) {
      console.error(error);
      logger.error(JSON.stringify(error));
      return { count: 0, error: 'Unable to process the data' };
    }
  }

  async *getUserDataValues(worksheet, headers) {
    let i = 2;
    while (i < worksheet.rowCount) {
      logger.debug(`Processing row ${i}`);
      const row = worksheet.getRow(i);
      const details: any = {};
      let email: any = (headers.email < 0 ? null : row.getCell(headers.email).value) || '';
      if (email.text) {
        email = email.text;
      }
      details.email = email.trim().toLowerCase();
      if (details.email !== '') {
        details.key = ((headers.key < 0 ? null : row.getCell(headers.key).value) || '').toLowerCase();

        if (headers.timestamp && headers.timestamp !== -1) {
          details.timestamp = row.getCell(headers.timestamp).value;
        }

        const value: any = {};
        if (headers.value && headers.value !== -1) {
          value.value = row.getCell(headers.value).value;
        }
        if (headers.details && headers.details.length > 0) {
          const additionalDetails: any = {};
          for (const col of headers.details) {
            additionalDetails[col.key] = row.getCell(col.index).value;
          }
          value.details = additionalDetails;
        }

        details.value = value;
        yield details;
      } else {
        logger.debug(`Row ${i} has empty email`);
      }
      i++;
    }
  }

  @Get('/:id/stats')
  @OpenAPI({ summary: 'Return stats of the user matched by the `id`' })
  @Authorized(['user.read'])
  async getUserStatsById(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    @QueryParam('usergroup') usergroup: string = 'org:Team',
    @QueryParam('types') types?: string,
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

    const groups = usergroup.split(',').map(g => g.trim());

    try {
      const readPerms = req.permissions.filter(p => p.startsWith('user.read'));
      const canRead = await currentUser.canRead(matchedUser, readPerms);
      if (canRead === false) {
        logger.warn(`user ${currentUser.email} does not have permission to read user ${matchedUser.email}}`);
        throw new HttpError(403);
      }
      const { users: groupUsers, allowedGroups } = await matchedUser.loadOrg(reqdate, groups);
      const { industries, clients, crafts, capabilities } = allowedGroups;

      logger.debug(`getting stats for ${groupUsers.length} for ${usergroup} users`);

      const dataworkers = groupUsers.map(u => {
        return new Promise(resolve => {
          if (!u.snapshot_date) {
            logger.debug(`user ${u.email} has no snapshot date`);
            return resolve(u);
          }
          if (u.snapshot_date.getTime() === reqdate.getTime()) return resolve(u);
          UserDataEntity.getUserData(u.id, reqdate).then(data => {
            UserEntity.merge(u, data);
            resolve(u);
          });
        });
      });
      await Promise.all(dataworkers);

      console.log(allowedGroups);
      const pdastats = await UserEntity.getPDAStats(reqdate);
      const groupStats = UserEntity.calculatePDAStats(groupUsers);
      const cpStats = capabilities.map(c => pdastats.capability[c]).filter(s => s !== undefined);
      const cfStats = crafts.map(c => pdastats.craft[c]).filter(s => s !== undefined);
      const accountStats = clients.map(c => pdastats.account[c]).filter(s => s !== undefined);
      const teamStats = industries.map(c => pdastats.team[c]).filter(s => s !== undefined);
      result.data = [];

      const countStat = {
        name: 'Count',
        value: groupStats.totalCount,
        all: pdastats.all.totalCount,
        capability: cpStats.reduce((s, c) => s + c.totalCount, 0),
        industry: teamStats.reduce((s, c) => s + c.totalCount, 0),
        account: accountStats.reduce((s, c) => s + c.totalCount, 0),
        craft: cfStats.reduce((s, c) => s + c.totalCount, 0),
      };

      result.data.push({
        name: 'Directs',
        value: groupUsers.filter(u => u.supervisor_id === matchedUser.oid).length,
        all: Math.trunc(pdastats.all.avgDirectsCount * 100) / 100,
        capability: cpStats.length > 0 ? Math.trunc((cpStats.reduce((s, c) => s + c.avgDirectsCount, 0) / cpStats.length) * 100) / 100 : undefined,
        industry:
          teamStats.length > 0 ? Math.trunc((teamStats.reduce((s, c) => s + c.avgDirectsCount, 0) / teamStats.length) * 100) / 100 : undefined,
        account:
          accountStats.length > 0
            ? Math.trunc((accountStats.reduce((s, c) => s + c.avgDirectsCount, 0) / accountStats.length) * 100) / 100
            : undefined,
        craft: cfStats.length > 0 ? Math.trunc((cfStats.reduce((s, c) => s + c.avgDirectsCount, 0) / cfStats.length) * 100) / 100 : undefined,
      });

      result.data.push({
        name: 'Leverage',
        value: groupStats.cs_map,
        all: pdastats.all.cs_map,
        // capability: cpStats.cs_map,
        // industry: teamStats.cs_map,
        // account: accountStats.cs_map,
        // craft: cfStats.cs_map,
      });
      result.data.push(countStat);
      result.data.push({
        name: 'FTE %',
        value: groupStats.fteCount / groupUsers.length,
        all: pdastats.all.fteCount / pdastats.all.totalCount,
        capability: countStat.capability > 0 ? cpStats.reduce((s, c) => s + c.fteCount, 0) / countStat.capability : undefined,
        industry: countStat.industry > 0 ? teamStats.reduce((s, c) => s + c.fteCount, 0) / countStat.industry : undefined,
        account: countStat.account > 0 ? accountStats.reduce((s, c) => s + c.fteCount, 0) / countStat.account : undefined,
        craft: countStat.craft > 0 ? cfStats.reduce((s, c) => s + c.fteCount, 0) / countStat.craft : undefined,
      });
      result.data.push({
        name: 'Diversity %',
        value: groupStats.diversityCount / groupUsers.length,
        all: pdastats.all.diversityCount / pdastats.all.totalCount,
        capability: countStat.capability > 0 ? cpStats.reduce((s, c) => s + c.diversityCount, 0) / countStat.capability : undefined,
        industry: countStat.industry > 0 ? teamStats.reduce((s, c) => s + c.diversityCount, 0) / countStat.industry : undefined,
        account: countStat.account > 0 ? accountStats.reduce((s, c) => s + c.diversityCount, 0) / countStat.account : undefined,
        craft: countStat.craft > 0 ? cfStats.reduce((s, c) => s + c.diversityCount, 0) / countStat.craft : undefined,
      });
      result.data.push({
        name: 'PS Exp',
        value: groupStats.totalExp / groupUsers.length,
        all: pdastats.all.totalExp / pdastats.all.totalCount,
        capability: countStat.capability > 0 ? cpStats.reduce((s, c) => s + c.totalExp, 0) / countStat.capability : undefined,
        industry: countStat.industry > 0 ? teamStats.reduce((s, c) => s + c.totalExp, 0) / countStat.industry : undefined,
        account: countStat.account > 0 ? accountStats.reduce((s, c) => s + c.totalExp, 0) / countStat.account : undefined,
        craft: countStat.craft > 0 ? cfStats.reduce((s, c) => s + c.totalExp, 0) / countStat.craft : undefined,
      });
      result.data.push({
        name: 'TiT Exp',
        value: groupStats.titleExp / groupUsers.length,
        all: pdastats.all.titleExp / pdastats.all.totalCount,
        capability: countStat.capability > 0 ? cpStats.reduce((s, c) => s + c.titleExp, 0) / countStat.capability : undefined,
        industry: countStat.industry > 0 ? teamStats.reduce((s, c) => s + c.titleExp, 0) / countStat.industry : undefined,
        account: countStat.account > 0 ? accountStats.reduce((s, c) => s + c.titleExp, 0) / countStat.account : undefined,
        craft: countStat.craft > 0 ? cfStats.reduce((s, c) => s + c.titleExp, 0) / countStat.craft : undefined,
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

  @Get('/:id/groups')
  @OpenAPI({ summary: 'Return groups of the user matched by the `id` is member of and their role' })
  @Authorized(['user.read'])
  async getUserGroups(@Param('id') userId: string, @CurrentUser() currentUser?: UserEntity) {
    const result = new APIResponse<Array<{ type: string; name: string; role: string }>>();
    if (userId === '-1') return [];
    const matchedUser = await this.getUser(userId, currentUser);
    result.data = await UserGroupEntity.GetGroupsForUser(matchedUser);
    return result;
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

  @Post('/data')
  @OpenAPI({ summary: 'Add/update a data for the user matched by the `id`' })
  async addData(@Body() data: IUserData, @CurrentUser() currentUser?: UserEntity) {
    const matchedUser = await UserEntity.getUserById(data.userid);
    if (!matchedUser) throw new NotFoundError();
    const result = new APIResponse<IUserData>();
    const matchedData = await AppDataSource.getRepository(UserDataEntity).findOne({
      where: {
        userid: data.userid,
        key: data.key,
        timestamp: data.timestamp,
      },
    });
    if (matchedData) {
      matchedData.value = data.value;
      result.data = matchedData.toJSON();
      return result.data;
    }
    try {
      const newData = await UserDataEntity.Add(data.userid, data.key, data.value, data.timestamp);
      result.data = newData.toJSON();
      return result;
    } catch (err) {
      logger.error(JSON.stringify(err));
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
      logger.error(JSON.stringify(err));
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
