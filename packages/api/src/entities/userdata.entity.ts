import { AppDataSource } from '@/databases';
import { logger } from '@/utils/logger';
import { IUserData } from '@sharedtypes';
import { BaseEntity, Entity, PrimaryColumn, Column, Index, In, LessThan, Any, Between, LessThanOrEqual } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'psuserdata' })
@Index(['userid', 'key', 'timestamp'])
export class UserDataEntity extends BaseEntity implements IUserData {
  @PrimaryColumn()
  userid: number;

  @PrimaryColumn()
  key: string;

  @PrimaryColumn({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: false })
  value: string | number | boolean | Record<string, unknown>;

  toJSON(): IUserData {
    return {
      userid: this.userid,
      key: this.key,
      timestamp: this.timestamp,
      value: this.value,
    };
  }
  static async Add(userid: number, key: string, value: string | number | boolean | Record<string, unknown>, timestamp: Date) {
    const repo = AppDataSource.getRepository(UserDataEntity);
    // const month = `${timestamp.getUTCFullYear()}-${timestamp.getUTCMonth()}`;
    let data: UserDataEntity;
    try {
      data = await repo.findOne({
        where: { userid, key, timestamp: LessThanOrEqual(timestamp) },
        order: {
          timestamp: 'DESC',
        },
      });
    } catch (ex) {
      logger.error(`Unable to find userdata for ${userid} ${key} ${timestamp}`);
      logger.debug(JSON.stringify(ex));
    }
    if (!data) {
      data = await UserDataEntity.create({
        userid,
        key,
        value,
        timestamp,
      }).save();
      return data;
    }

    if (data.value === value) return data;

    return await UserDataEntity.create({
      userid,
      key,
      value,
      timestamp,
    }).save();
  }

  static async Get(userid: number, key: string, cache: boolean | number = true) {
    const repo = AppDataSource.getRepository(UserDataEntity);
    const data = await repo.findOne({
      where: { userid, key },
      order: {
        timestamp: 'DESC',
      },
      cache,
    });
    return data;
  }
  static async GetSeries(userid: number[], keys: string[], minDate: Date, maxDate: Date = new Date(), cache: boolean | number = true) {
    const repo = AppDataSource.getRepository(UserDataEntity);
    const data: UserDataEntity[] = await repo.find({
      where: {
        userid: Any(userid),
        key: Any(keys),
        timestamp: Between(minDate, maxDate),
      },
      order: {
        timestamp: 'DESC',
      },
      cache,
    });
    return data;
  }

  static async getCustomUserDataKeys(userId?: string | number) {
    const data = await AppDataSource.query(
      `select distinct(key), c.id as id, c.name as name, c.type as type, c.details as details FROM psuserdata INNER JOIN config c on c.name=psuserdata.key where key like 'c-%'` + (userId ? `OR key like 'u-${userId}%'` : '') + ';',
    );
    return data.map(d => ({ key: d.key, config: { id: d.id, name: d.name, type: d.type, details: d.details } }));
  }

  static async getUserData(userId: number, timestamp: Date, keys?: string[]) {
    if (!keys) keys = UserEntity.UserDataMap.default;

    if (keys.length === 0) return {};

    const query = keys
      .map(key => `(SELECT * FROM psuserdata WHERE key='${key}' AND userid=$1 AND timestamp<=$2 ORDER BY timestamp DESC LIMIT 1)`)
      .join(' UNION ALL ');
    const data = await AppDataSource.query(query, [userId, timestamp]);
    const result: any = { data: {} };
    data.forEach((d: { key: string; value: { supervisor_id: any } }) => {
      if (d.key === 'supervisor_id') {
        result[d.key] = d.value.supervisor_id;
      } else if (d.key.startsWith('c-') || d.key.startsWith('u-') || d.key.startsWith('s-')) {
        result.data[d.key] = d.value;
      } else {
        result[d.key] = d.value;
      }
    });
    return result;
  }
}
