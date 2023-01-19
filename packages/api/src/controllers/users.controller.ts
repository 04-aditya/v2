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
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { validationMiddleware } from '@middlewares/validation.middleware';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { IUser, APIResponse, IPermission, IUserPAT } from 'sharedtypes';
import authMiddleware from '@/middlewares/auth.middleware';
import { Request } from 'express';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { HttpException } from '@/exceptions/HttpException';
import { UserPATEntity } from '@/entities/userpat.entity';
import { azureStorage } from '@/utils/azmulterstorage';
import { logger } from '@/utils/logger';
import { BlobServiceClient } from '@azure/storage-blob';
import AsyncTask from '@/utils/asyncTask';
import Excel from 'exceljs';
import { format, parse as parseDate } from 'date-fns';

@JsonController('/api/users')
@UseBefore(authMiddleware)
export class UsersController {
  @Get('/:id')
  @OpenAPI({ summary: 'Return user matched by the `id`' })
  @Authorized(['user.read'])
  async getUserById(@Param('id') userId: string, @CurrentUser() currentUser?: UserEntity) {
    const result = new APIResponse<IUser>();
    if (userId !== 'me') {
      if (!currentUser.hasRoleOrPermission(['admin'])) throw new HttpError(403);
      const matchedUser = await AppDataSource.getRepository(UserEntity).findOne({
        where: {
          id: parseInt(userId),
        },
      });
      result.data = matchedUser.toJSON();
    } else {
      result.data = currentUser.toJSON();
    }
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
      (await matchedUser.getPermissions()).forEach(p => {
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

  static fileUploadOptions = () => ({
    storage: azureStorage,
    // fileFilter: (req: any, file: any, cb: any) => { ...
    // },
    // limits: {
    //     fieldNameSize: 255,
    //     fileSize: 1024 * 1024 * 2
    // }
  });

  // use options this way:
  @Post('/upload')
  async uploadData(@UploadedFile('file') file: any, @BodyParam('snapshot_date') snapshotdate: Date, @Req() req: RequestWithUser) {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZCONNSTR;

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      logger.error('Azure Storage Connection string not found');
    }

    // Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZUPLOADCONTAINER);

    // Create a unique name for the blob
    const blobName = `${req.user.id}/${file.originalname}`;

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Display blob name and url
    logger.info(`\nUploading to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`);

    // Upload data to the blob
    const uploadBlobResponse = await blockBlobClient.uploadData(file.buffer);
    logger.debug(`Blob was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`);
    const qt = new AsyncTask(this.processFileData(file.buffer, snapshotdate, req.permissions, req.user), req.user.id);
    return { data: qt.id, message: 'created' };
  }

  async *getUserValues(worksheet, headers) {
    let i = 2;
    while (i < worksheet.rowCount) {
      const row = worksheet.getRow(i);

      const details: any = {};
      const first_name = (headers.first_name < 0 ? null : row.getCell(headers.first_name).value) || '';
      const middle_name = (headers.middle_name < 0 ? null : row.getCell(headers.middle_name).value) || '';
      const last_name = (headers.last_name < 0 ? null : row.getCell(headers.last_name).value) || '';
      const name = first_name.trim() + ' ' + middle_name.trim() + ' ' + last_name.trim();
      const email = (headers.email < 0 ? null : row.getCell(headers.email).value) || '';
      details.email = email.toLowerCase();
      details.name = name;
      details.first_name = first_name;
      details.middle_name = middle_name;
      details.last_name = last_name;
      if (headers.gender && headers.gender !== -1) {
        details.gender = row.getCell(headers.gender).value;
      }
      if (headers.persontype && headers.persontype !== -1) {
        const persontype = row.getCell(headers.persontype).value;
        if (persontype === 'Sapient Person') {
          details.contractor = false;
        } else {
          details.contractor = true;
        }
      }
      if (headers.oid && headers.oid !== -1) {
        details.oid = row.getCell(headers.oid).value;
      }

      if (headers.csid && headers.csid !== -1) {
        details.csid = row.getCell(headers.csid).value;
      }

      if (headers.client_name && headers.client_name !== -1) {
        details.client = (headers.client_name < 0 ? null : row.getCell(headers.client_name).value) || '';
      }

      if (headers.hrms_team_level1 && headers.hrms_team_level1 !== -1) {
        details.hrms_team_levell1 = (headers.hrms_team_level1 < 0 ? null : row.getCell(headers.hrms_team_level1).value) || '';
      }
      if (headers.hrms_team_level2 && headers.hrms_team_level2 !== -1) {
        details.capability = (headers.hrms_team_level2 < 0 ? null : row.getCell(headers.hrms_team_level2).value) || '';
      }
      if (headers.hrms_team_level3 && headers.hrms_team_level3 !== -1) {
        details.craft = (headers.hrms_team_level3 < 0 ? null : row.getCell(headers.hrms_team_level3).value) || '';
      }

      if (headers.team_name && headers.team_name !== -1) {
        details.team = row.getCell(headers.team_name).value;
      }

      if (headers.home_region && headers.home_region !== -1) {
        details.home_region = row.getCell(headers.home_region).value;
      }
      if (headers.current_region && headers.current_region !== -1) {
        details.current_region = row.getCell(headers.current_region).value;
      }
      if (headers.supervisor && headers.supervisor !== -1) {
        let sparts = row.getCell(headers.supervisor).value;
        if (sparts) {
          sparts = sparts.split('(');
          details.supervisor_oid = parseInt(sparts[1]);
          details.supervisor_name = sparts[0]
            .split(',')
            .reverse()
            .map(s => s.trim())
            .filter(s => s !== '')
            .join(' ');
        }
      }
      if (headers.title && headers.title !== -1) {
        details.title = row.getCell(headers.title).value;
      }
      if (headers.career_stage && headers.career_stage !== -1) {
        details.career_stage = row.getCell(headers.career_stage).value;
      }
      if (headers.start_date && headers.start_date !== -1) {
        details.startdate = format(row.getCell(headers.start_date).value, 'yyyy-MM-dd');
      }
      if (headers.last_promotion_date && headers.last_promotion_date !== -1) {
        try {
          const lpd = row.getCell(headers.last_promotion_date).value;
          if (lpd) {
            details.lastpromodate = format(lpd, 'yyyy-MM-dd');
          }
        } catch (err) {
          logger.error(err);
          logger.debug(row.getCell(headers.last_promotion_date).value);
        }
      }
      i++;
      yield details;
    }
  }

  async processFileData(buffer: Buffer, snapshot_date: Date, permissions: string[], user: UserEntity) {
    try {
      // load from buffer
      const workbook: any = new Excel.Workbook();
      await workbook.xlsx.load(buffer);

      // access by `worksheets` array:
      const worksheet: any = workbook.getWorksheet('Base Data'); // workbook.worksheets[0]; //the first one;

      const headerRow: any = worksheet.getRow(1);
      const columns = headerRow.values.map(h => h.toUpperCase());
      logger.info(`File contains: ${worksheet.rowCount} rows`);

      const headers = {
        oid: columns.indexOf('ORACLE_ID') || columns.indexOf('OID'),
        csid: columns.indexOf('Career Settings_ID'),
        email: columns.indexOf('EMAIL_ADDRESS') || columns.indexOf('EMAIL'),

        first_name: columns.indexOf('FIRST_NAME'),
        middle_name: columns.indexOf('MIDDLE_NAME'),
        last_name: columns.indexOf('LAST_NAME'),
        gender: columns.indexOf('GENDER'),

        persontype: columns.indexOf('PERSONTYPE'),
        title: columns.indexOf('TITLE_NAME'),
        career_stage: columns.indexOf('CAREER_STAGE'),

        hrms_team_level1: columns.indexOf('HRMS_TEAM'),
        hrms_team_level2: columns.indexOf('HRMS_TEAM_LEVEL2'),
        hrms_team_level3: columns.indexOf('HRMS_TEAM_LEVEL3'),

        supervisor: columns.indexOf('SUPERVISOR'),
        supervisor_id: columns.indexOf('SUPERVISOR_ID'),
        start_date: columns.indexOf('STARTDATE'),

        client_name: columns.indexOf('CLIENT_NAME'),
        team_name: columns.indexOf('TEAM_NAME'),
        project_name: columns.indexOf('PROJECT_NAME'),

        home_region: columns.indexOf('HOME_REGION'),
        current_region: columns.indexOf('CURRENT_REGION'),
      };
      // DIV	BRAND	BU	DOMAIN	PRIMARY_CAPABILITY CATEGORY	STAFFING_PARTNER	PID

      logger.debug(JSON.stringify(headers, null, 2));

      let updatedCount = 0;
      const oidmap = new Map<string, any>();
      for await (const values of this.getUserValues(worksheet, headers)) {
        try {
          //logger.info(values.email);
          const newuser = await UserEntity.CreateUser(values.email);
          oidmap.set(values.oid + '', { user: newuser, values });
          updatedCount++;
          if (updatedCount === 2) {
            logger.debug(JSON.stringify(values, null, 2));
          }
          if (updatedCount % 1000 === 0) {
            logger.debug(`processed ${updatedCount} rows`);
          }
        } catch (ex) {
          logger.error(ex);
        }
      }
      updatedCount = 0;
      logger.debug('updating users data');
      for await (const data of oidmap.values()) {
        const user = data.user as UserEntity;
        const manager = oidmap[data.values.supervisor_oid + '']?.user as UserEntity;
        if (manager) {
          user.manager = manager;
        }
        if (data.values.oid) {
          user.oid = data.values.oid;
        }
        if (data.values.csid) {
          user.csid = data.values.csid;
        }
        if (data.values.persontype) {
          user.gender = data.values.gender;
        }
        if (data.values.first_name) {
          user.first_name = data.values.first_name;
        }
        if (data.values.middle_name) {
          user.middle_name = data.values.middle_name;
        }
        if (data.values.last_name) {
          user.last_name = data.values.last_name;
        }
        if (user.career_stage) {
          user.career_stage = data.values.career_stage;
        }
        if (user.business_title) {
          user.business_title = data.values.title;
        }
        if (data.values.contractor) {
          user.employment_type = 'Contractor';
        }
        if (data.values.start_date) {
          user.most_recent_hire_date = parseDate(data.values.start_date, 'yyyy-MM-dd', new Date());
          if (updatedCount === 2) {
            logger.debug(JSON.stringify(user.most_recent_hire_date, null, 2));
            logger.debug(data.values.start_date);
          }
        }
        await user.save();
        updatedCount++;
        if (updatedCount === 2) {
          logger.debug(JSON.stringify(user.toJSON(), null, 2));
        }
        if (updatedCount % 1000 === 0) {
          logger.debug(`updated ${updatedCount} rows`);
        }
      }
      logger.info(`processed ${updatedCount} rows`);
      return { count: updatedCount };
    } catch (error) {
      console.error(error);
      return { count: 0, error: 'Unable to process the data' };
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
