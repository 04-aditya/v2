import { join } from 'path';
import { DataSource } from 'typeorm';
import { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_DATABASE } from '@config';
import { UserEntity } from '@/entities/user.entity';
import { UserRoleEntity } from '@/entities/userrole.entity';
import { PermissionEntity } from '@/entities/permission.entity';
import { redisOptions } from '@/utils/redisInstance';
import { UserPATEntity } from '@/entities/userpat.entity';
import { UserDataEntity } from '@/entities/userdata.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: Number(DB_PORT),
  username: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  synchronize: true,
  poolSize: 10,
  logging: Boolean(process.env.DB_LOG),
  entities: [UserEntity, UserRoleEntity, PermissionEntity, UserPATEntity, UserDataEntity],
  // migrations: [join(__dirname, '../**/*.migration{.ts,.js}')],
  // subscribers: [join(__dirname, '../**/*.subscriber{.ts,.js}')],
  cache: {
    type: 'ioredis',
    options: redisOptions,
  },
});
