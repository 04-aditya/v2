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
  UploadedFile,
  Req,
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { AppDataSource } from '@/databases';
import { UserEntity } from '@/entities/user.entity';
import { IUser, APIResponse, IPermission, IUserRole } from 'sharedtypes';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import AsyncTask, { stringFn } from '@/utils/asyncTask';
import { PermissionEntity } from '@/entities/permission.entity';
import { UserRoleEntity } from '@/entities/userrole.entity';
import { logger } from '@/utils/logger';
import { BlobServiceClient } from '@azure/storage-blob';
import Excel from 'exceljs';
import { format, parse as parseDate, intervalToDuration, addYears } from 'date-fns';
import { UserDataEntity } from '@/entities/userdata.entity';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { UserGroupEntity } from '@/entities/usergroup.entity';

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
    result.data = matchedUsers.map(u => u.toJSON('all'));

    return result;
  }

  @Post('/refreshuser/pda')
  @OpenAPI({ summary: 'Refresh users data from pda' })
  @Authorized(['user.write.all.all'])
  async refreshUsers(@BodyParam('email') email: string, @CurrentUser() currentUser: UserEntity) {
    const user = await UserEntity.getUserById(email);
    if (!user) throw new HttpException(404, 'User not found');
    const qt = new AsyncTask(updater => user.refresh(), currentUser.id);
    return { qid: qt.id, message: 'created' };
  }

  @Post('/upload')
  @Authorized(['user.write.all.all'])
  async uploadData(@UploadedFile('file') file: any, @BodyParam('snapshot_date') snapshotdate: Date, @Req() req: RequestWithUser) {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZCONNSTR;

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      logger.error('Azure Storage Connection string not found');
    }

    // Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZUPLOADCONTAINER);

    // Create a unique name for the blob
    const blobName = `${req.user.id}/pda/${file.originalname}`;

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Display blob name and url
    logger.info(`\nUploading to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`);

    // Upload data to the blob
    const uploadBlobResponse = await blockBlobClient.uploadData(file.buffer);
    logger.debug(`Blob was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`);
    logger.debug(`Starting processing PDA data for date: ${snapshotdate}`);
    const qt = new AsyncTask(updater => this.processFileData(updater, file.buffer, snapshotdate, req.permissions, req.user), req.user.id);
    return { qid: qt.id, message: 'created' };
  }

  async *getUserValues(worksheet, headers) {
    let i = 2;
    while (i < worksheet.rowCount) {
      const row = worksheet.getRow(i);
      try {
        const details: any = {};
        const email = (headers.email < 0 ? null : row.getCell(headers.email).value) || '';
        details.email = email.trim().toLowerCase();
        if (details.email !== '') {
          const first_name = (headers.first_name < 0 ? null : row.getCell(headers.first_name).value) || '';
          const middle_name = (headers.middle_name < 0 ? null : row.getCell(headers.middle_name).value) || '';
          const last_name = (headers.last_name < 0 ? null : row.getCell(headers.last_name).value) || '';
          const name = first_name.trim() + ' ' + middle_name.trim() + ' ' + last_name.trim();
          details.name = name;
          details.first_name = first_name;
          details.middle_name = middle_name;
          details.last_name = last_name;
          if (headers.gender && headers.gender !== -1) {
            details.gender = row.getCell(headers.gender).value.trim();
          }
          if (headers.persontype && headers.persontype !== -1) {
            const persontype = row.getCell(headers.persontype).value.trim();
            if (persontype === 'Contractor') {
              details.contractor = true;
            } else {
              details.contractor = false;
            }
          }
          if (headers.oid && headers.oid !== -1) {
            details.oid = parseInt(row.getCell(headers.oid).value);
          }
          if (headers.csid && headers.csid !== -1) {
            details.csid = parseInt(row.getCell(headers.csid).value);
          }
          if (headers.supervisor_id && headers.supervisor_id !== -1) {
            details.supervisor_id = parseInt(row.getCell(headers.supervisor_id).value);
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
            if (details.team.startsWith('Team ')) {
              details.team = details.team.substring(5);
            }
            details.team = details.team ? details.team.trim() : details.team;
          }

          if (headers.client_name && headers.client_name !== -1) {
            details.client = row.getCell(headers.client_name).value;
            details.client = details.client ? details.client.trim() : details.client;
          }

          if (headers.home_office && headers.home_office !== -1) {
            details.home_office = row.getCell(headers.home_office).value;
          }

          if (headers.home_region && headers.home_region !== -1) {
            details.home_region = row.getCell(headers.home_region).value;
          }
          if (headers.current_region && headers.current_region !== -1) {
            details.current_region = row.getCell(headers.current_region).value;
          }
          if (headers.current_office && headers.current_office !== -1) {
            details.current_office = row.getCell(headers.current_office).value;
          }
          if (headers.supervisor && headers.supervisor !== -1) {
            let sparts = row.getCell(headers.supervisor).value;
            if (sparts) {
              sparts = sparts.split('(');
              if (!details.supervisor_id) {
                details.supervisor_id = parseInt(sparts[1]);
              }
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
          if (headers.time_since_last_promotion && headers.time_since_last_promotion !== -1) {
            try {
              const val = row.getCell(headers.time_since_last_promotion).value;
              if (val) {
                const tlp = parseFloat(val + '');
                details.lastpromodate = format(addYears(new Date(), -1 * tlp), 'yyyy-MM-dd');
              }
            } catch (err) {
              logger.error(err);
              logger.debug(row.getCell(headers.time_since_last_promotion).value);
            }
          }
          if (headers.snapshot_date && headers.snapshot_date !== -1) {
            details.snapshot_date = format(row.getCell(headers.snapshot_date).value, 'yyyy-MM-dd');
          }
          yield details;
        } else {
          logger.debug(`Row ${i} has empty email`);
        }
      } catch (ex) {
        logger.error(JSON.stringify(ex));
        logger.error(`Error processing row ${i}`);
        logger.debug(JSON.stringify(row.values));
      }
      i++;
    }
  }

  async processFileData(updater: stringFn, buffer: Buffer, defaultsnapshot_date: Date, permissions: string[], user: UserEntity) {
    try {
      // load from buffer
      const workbook: any = new Excel.Workbook();
      await workbook.xlsx.load(buffer);

      // access by `worksheets` array:
      //get the first worksheet from workbook
      const worksheet = workbook.worksheets[0];

      const headerRow: any = worksheet.getRow(1);
      const columns = headerRow.values.map(h => h.trim().toUpperCase().replace(/ /g, '_'));
      logger.info(`File contains: ${worksheet.rowCount} rows`);
      updater(`processing: ${worksheet.rowCount} rows`);

      const headers = {
        oid: columns.indexOf('ORACLE_ID') || columns.indexOf('OID'),
        csid: columns.indexOf('CAREER_SETTINGS_ID') || columns.indexOf('CSID'),
        email: columns.indexOf('EMAIL_ADDRESS') || columns.indexOf('EMAIL'),

        first_name: columns.indexOf('FIRST_NAME'),
        middle_name: columns.indexOf('MIDDLE_NAME'),
        last_name: columns.indexOf('LAST_NAME'),
        gender: columns.indexOf('GENDER'),

        persontype: columns.indexOf('PERSONTYPE'),
        title: columns.indexOf('TITLE_NAME'),
        career_stage: columns.indexOf('CAREER_STAGE'),
        time_since_last_promotion: columns.indexOf('TIME_SINCE_LAST_PROMOTION'),

        hrms_team_level1: columns.indexOf('HRMS_TEAM'),
        hrms_team_level2: columns.indexOf('HRMS_TEAM_LEVEL2'),
        hrms_team_level3: columns.indexOf('HRMS_TEAM_LEVEL3'),

        supervisor: columns.indexOf('SUPERVISOR'),
        supervisor_id: columns.indexOf('SUPERVISOR_ID'),
        start_date: columns.indexOf('STARTDATE'),

        client_name: columns.indexOf('CLIENT_NAME'),
        team_name: columns.indexOf('TEAM_NAME'),
        project_name: columns.indexOf('PROJECT_NAME'),

        home_office: columns.indexOf('HOME_OFF'),
        home_region: columns.indexOf('HOME_REGION'),
        current_office: columns.indexOf('CURRENT_OFF'),
        current_region: columns.indexOf('CURRENT_REGION'),
        snapshot_date: columns.indexOf('SNAPSHOT_DATE'),
      };
      // DIV	BRAND	BU	DOMAIN	PRIMARY_CAPABILITY CATEGORY	STAFFING_PARTNER	PID

      logger.debug(JSON.stringify(headers, null, 2));
      let updatedCount = 0;
      for await (const values of this.getUserValues(worksheet, headers)) {
        try {
          const snapshot_date = values.snapshot_date ? parseDate(values.snapshot_date, 'yyyy-MM-dd', new Date()) : defaultsnapshot_date;
          //logger.info(values.email);
          const user = await UserEntity.CreateUser(values.email);
          const isNewData = user.snapshot_date ? snapshot_date.getTime() >= user.snapshot_date.getTime() : true;
          if (values.oid && isNewData) {
            user.oid = values.oid;
          }
          if (values.csid && isNewData) {
            user.csid = values.csid;
          }
          if (values.gender && isNewData) {
            user.gender = values.gender;
          }
          if (values.first_name && isNewData) {
            user.first_name = values.first_name;
          }
          if (values.middle_name && isNewData) {
            user.middle_name = values.middle_name;
          }
          if (values.last_name && isNewData) {
            user.last_name = values.last_name;
          }
          if (values.title && isNewData) {
            user.business_title = values.title;
          }
          if (values.startdate) {
            if (isNewData) {
              user.most_recent_hire_date = values.startdate;
            }
          }
          if (values.lastpromodate) {
            if (isNewData) {
              user.last_promotion_date = values.lastpromodate;
            }
          }

          if (values.career_stage) {
            await UserDataEntity.Add(user.id, 'career_stage', values.career_stage, snapshot_date);
            if (isNewData) {
              user.career_stage = values.career_stage;
            }
          }
          if (values.craft) {
            await UserDataEntity.Add(user.id, 'craft', values.craft, snapshot_date);
            if (isNewData) {
              user.craft = values.craft;
            }
          }
          if (values.capability) {
            await UserDataEntity.Add(user.id, 'capability', values.capability, snapshot_date);
            if (isNewData) {
              user.capability = values.capability;
            }
          }
          if (values.team) {
            if (isNewData) {
              user.team = values.team;
            }
            await UserDataEntity.Add(user.id, 'team', values.team, snapshot_date);
            await UserGroupEntity.Add(values.team, 'industry');
          }
          if (values.client) {
            if (isNewData) {
              user.account = values.client;
            }
            await UserDataEntity.Add(user.id, 'client', values.client, snapshot_date);
            await UserGroupEntity.Add(values.client, 'client');
            // .then(client => {
            //   if (!client.industry && user.team) {
            //     client.industry = user.team;
            //     client.save();
            //   }
            // });
          }
          if (values.current_region) {
            if (isNewData) {
              user.current_region = values.current_region;
            }
            await UserDataEntity.Add(user.id, 'current_region', values.current_region, snapshot_date);
          }
          if (values.current_office) {
            if (isNewData) {
              user.current_office = values.current_office;
            }
            await UserDataEntity.Add(user.id, 'current_office', values.current_office, snapshot_date);
          }

          if (values.home_office) {
            if (isNewData) {
              user.home_office = values.home_office;
            }
            await UserDataEntity.Add(user.id, 'home_office', values.home_office, snapshot_date);
          }

          if (values.home_region) {
            if (isNewData) {
              user.home_region = values.home_region;
            }
            await UserDataEntity.Add(user.id, 'home_region', values.home_region, snapshot_date);
          }

          if (values.contractor) {
            user.employment_type = 'Contractor';
            await UserDataEntity.Add(user.id, 'employment_type', 'Contractor', snapshot_date);
          } else {
            user.employment_type = 'Fulltime';
            await UserDataEntity.Add(user.id, 'employment_type', 'Fulltime', snapshot_date);
          }
          if (values.supervisor_id) {
            if (user.supervisor_id !== values.supervisor_id) {
              if (isNewData) {
                user.supervisor_id = values.supervisor_id;

                if (values.supervisor_name) {
                  user.supervisor_name = values.supervisor_name;
                }
              }
            }
            await UserDataEntity.create({
              userid: user.id,
              key: 'supervisor_id',
              value: { supervisor_id: values.supervisor_id, oid: user.oid, csid: user.csid },
              timestamp: snapshot_date,
            }).save();
            //.catch(ex => {
            //  logger.error(ex);
            //});
          }
          if (isNewData) {
            user.snapshot_date = snapshot_date;
          }
          await user.save();

          updatedCount++;
          if (updatedCount === 2) {
            logger.debug(JSON.stringify(values, null, 2));
          }
          if (updatedCount % 100 === 0) {
            logger.info(`Processed ${updatedCount} rows`);
            updater(`Processed: ${updatedCount} rows`);
          }
        } catch (ex) {
          logger.error(JSON.stringify(ex));
          logger.error(JSON.stringify(values, null, 2));
        }
      }

      UserEntity.updatePDAStats(defaultsnapshot_date);
      logger.info(`Finished processing ${updatedCount} rows`);
      return { count: updatedCount, message: `Finished processing ${updatedCount} rows.` };
    } catch (error) {
      logger.error(JSON.stringify(error));
      return { count: 0, error: 'Unable to process the data' };
    }
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
