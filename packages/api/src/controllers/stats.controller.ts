import { APIResponse, ConfigType, IConfigItem, IStatType } from '@/../../shared/types/src';
import { AppDataSource } from '@/databases';
import { ConfigEntity } from '@/entities/config.entity';
import { UserEntity } from '@/entities/user.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import { JsonController, UseBefore, Get, Authorized, Post, Body, CurrentUser, Delete, BodyParam } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { In } from 'typeorm';

@JsonController('/api/stats')
@UseBefore(authMiddleware)
export class StatsController {
  @Get('/types')
  @OpenAPI({ summary: 'Return `stat` config item matched by the query`' })
  async listStatTypes(@CurrentUser() currentUser: UserEntity) {
    if (!currentUser) throw new HttpException(403, 'Unauthorized');

    const result = new APIResponse<IStatType[]>();
    const matchedStats = await AppDataSource.getRepository(ConfigEntity).find({
      where: { type: ConfigType.STATCONFIGTYPE },
    });
    logger.debug(`fetched ${matchedStats.length} stats.`);
    result.data = matchedStats.map((p: IConfigItem) => p.details.value as IStatType);

    return result;
  }

  @Post('/types')
  @OpenAPI({ summary: 'Create a new `stat` config item' })
  @Authorized(['stats.write.all'])
  async upsertStats(@Body() data: IStatType) {
    const result = new APIResponse<IStatType>();
    let statconfig = await AppDataSource.getRepository(ConfigEntity).findOne({
      where: {
        name: data.name,
        type: ConfigType.STATCONFIGTYPE,
      },
    });
    if (!statconfig) {
      statconfig = new ConfigEntity();
      statconfig.name = data.name;
      statconfig.type = ConfigType.STATCONFIGTYPE;
    }
    statconfig.details = { value: data };
    await statconfig.save();
    result.data = statconfig.toJSON();

    return result;
  }

  @Delete('/types')
  @Authorized(['stats.write.all'])
  @OpenAPI({ summary: 'Delete a set of `stat` config items' })
  async deleteStats(@BodyParam('items') items: Array<string>) {
    const configRepo = AppDataSource.getRepository(ConfigEntity);

    const matchedItems = await configRepo.find({ where: { name: In(items), type: ConfigType.STATCONFIGTYPE } });

    await configRepo.remove(matchedItems);

    return { data: matchedItems, message: 'deleted' };
  }
}
