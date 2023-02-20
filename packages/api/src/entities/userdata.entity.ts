import { AppDataSource } from '@/databases';
import { IUserData } from 'sharedtypes';
import { BaseEntity, Entity, PrimaryColumn, Column, Index, In, LessThan } from 'typeorm';

@Entity({ name: 'psuserdata' })
@Index(['userid', 'key'])
export class UserDataEntity extends BaseEntity implements IUserData {
  @PrimaryColumn()
  userid: number;

  @PrimaryColumn()
  key: string;

  @Column({ type: 'jsonb', nullable: false })
  value: string | number | boolean | Record<string, unknown>;

  @Column({ nullable: false })
  @Index()
  timestamp: Date;

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
  static async GetSeries(userid: number, key: string, minDate: Date, maxDate: Date = new Date(), cache: boolean | number = true) {
    const repo = AppDataSource.getRepository(UserDataEntity);
    const data = await repo.findOne({
      where: {
        userid,
        key,
        timestamp: In([minDate, maxDate]),
      },
      order: {
        timestamp: 'DESC',
      },
      cache,
    });
    return data;
  }
}
