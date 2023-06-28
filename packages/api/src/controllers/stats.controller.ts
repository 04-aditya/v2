import { APIResponse, ConfigType, IConfigItem, IStatType } from '@/../../shared/types/src';
import { AppDataSource } from '@/databases';
import { ConfigEntity } from '@/entities/config.entity';
import { UserEntity } from '@/entities/user.entity';
import { HttpException } from '@/exceptions/HttpException';
import authMiddleware from '@/middlewares/auth.middleware';
import { logger } from '@/utils/logger';
import { JsonController, UseBefore, Get, Authorized, Post, Body, CurrentUser, Delete, BodyParam, QueryParam } from 'routing-controllers';
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
    result.data = matchedStats.map((p: IConfigItem) => ({ ...(p.details as IStatType), id: p.id }));

    return result;
  }

  @Post('/types/:id')
  @OpenAPI({ summary: 'Update a `stat` config item' })
  @Authorized(['stats.write.all', 'config.write.all'])
  async updateStats(@QueryParam('id') id: number, @Body() data: IStatType) {
    try {
      const result = new APIResponse<IStatType>();
      const repo = AppDataSource.getRepository(ConfigEntity);
      const statconfig: ConfigEntity[] = await repo.find({
        where: {
          id,
          type: ConfigType.STATCONFIGTYPE,
        },
      });
      if (!statconfig || statconfig.length < 1) throw new HttpException(404, 'Not found');
      logger.debug(statconfig[0].toJSON());
      statconfig[0].name = data.name;
      statconfig[0].details = { ...data, id };
      await statconfig[0].save();
      result.data = { ...data, id: statconfig[0].id };
      return result;
    } catch (ex) {
      console.error(ex);
      throw ex;
    }
  }

  @Post('/types')
  @OpenAPI({ summary: 'Create a new `stat` config item' })
  @Authorized(['stats.write.all', 'config.write.all'])
  async insertStats(@Body() data: IStatType) {
    const result = new APIResponse<IStatType>();
    const statconfig = new ConfigEntity();
    statconfig.name = data.name;
    statconfig.type = ConfigType.STATCONFIGTYPE;
    statconfig.details = data;
    await statconfig.save();
    result.data = { ...data, id: statconfig.id };
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
