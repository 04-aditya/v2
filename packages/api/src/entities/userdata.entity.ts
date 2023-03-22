import { AppDataSource } from '@/databases';
import { logger } from '@/utils/logger';
import { IUserData } from '@sharedtypes';
import { BaseEntity, Entity, PrimaryColumn, Column, Index, In, LessThan, Any } from 'typeorm';
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
    let data = await repo.findOne({
      where: { userid, key, timestamp: LessThan(timestamp) },
      order: {
        timestamp: 'DESC',
      },
    });
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
        timestamp: In([minDate, maxDate]),
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
      `select distinct(key) from psuserdata where key like 'c-%'` + (userId ? `OR key like 'u-${userId}%'` : '') + ';',
    );
    return data.map(d => d.key);
  }

  static async getUserData(id: number, timestamp: Date, keys?: string[]) {
    if (!keys) keys = UserEntity.UserDataMap.default;

    if (keys.length === 0) return {};

    const query = keys
      .map(k => `(SELECT * FROM psuserdata WHERE key='${k}' AND userid=$1 AND timestamp<=$2 ORDER BY timestamp DESC LIMIT 1)`)
      .join(' UNION ALL ');
    const data = await AppDataSource.query(query, [id, timestamp]);
    const result: any = {};
    data.forEach(d => {
      if (d.key === 'supervisor_id') {
        result[d.key] = d.value.supervisor_id;
      } else {
        result[d.key] = d.value;
      }
    });
    return result;
  }
}
