import { AppDataSource } from '@/databases';
import cache from '@/utils/cache';
import { logger } from '@/utils/logger';
import { IUser, IUserGroup } from '@sharedtypes';
import {
  BaseEntity,
  Column,
  Entity,
  ILike,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeamMemberEntity } from './teammember.entity';

@Entity({ name: 'usergroup' })
@Index(['name', 'type'], { unique: true })
export class UserGroupEntity extends BaseEntity implements IUserGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  name: string;

  @Column({ default: '' })
  type: string;

  @Column({ type: 'jsonb', default: {} })
  details?: Record<string, any>;

  @ManyToMany(() => TeamMemberEntity)
  @JoinTable()
  team: TeamMemberEntity[];

  toJSON(): IUserGroup {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      team: this.team ? this.team.map(p => p.toJSON()) : [],
      details: this.details,
    };
  }

  // this function is used to get a group by name and type
  // returns null if it doesn't exist
  // e.g. UserGroupEntity.GetByName('Java', 'craft')
  static async GetByNameAndType(name: string, type: string) {
    return await AppDataSource.getRepository(UserGroupEntity).findOne({
      where: {
        name,
        type,
      },
    });
  }

  // this function is used to add a industry by name
  // returns the industry if it already exists
  // e.g UserGroupEntity.Add('Retail', 'industry')
  static async Add(name: string, type: string) {
    const existing = await UserGroupEntity.GetByNameAndType(name, type);
    if (existing) return existing;
    try {
      const newclient = new UserGroupEntity();
      newclient.name = name;
      await newclient.save();
      return newclient;
    } catch (ex) {
      if (ex.code === '23505') {
        // if duplicate
        logger.warn(`duplicate usergroup for ${name} & ${type}.`, ex);
        return await UserGroupEntity.GetByNameAndType(name, type);
      } else {
        logger.error(ex);
        throw ex;
      }
    }
  }

  static async GetGroupsForUser(user: IUser) {
    const CACHEKEY = `usergroups-${user.id}`;
    const usergroupjson: string = await cache.get(CACHEKEY);
    if (usergroupjson) {
      logger.debug(`cache hit for ${CACHEKEY}`);
      return JSON.parse(usergroupjson) as Array<{ name: string; type: string; role: string }>;
    }
    let userGroupList: Array<{ name: string; type: string; role: string }> = await AppDataSource.query(
      `
      SELECT g.name, g.type, t.role FROM usergroup g
      INNER JOIN usergroup_team_teammember ut ON ut."usergroupId" = g.id
      INNER JOIN teammember t ON t.id = ut."teammemberId" where t."userId" = $1`,
      [user.id],
    );
    const directs = await AppDataSource.query(`SELECT count(*) from psuser where supervisor_id = $1 OR supervisor_id = $2`, [user.oid, user.csid]);
    logger.debug(`user directs count: ${directs[0].count}`);
    if (directs[0].count > 0) {
      userGroupList = [{ name: 'Directs', type: 'org', role: 'supervisor' }, { name: 'Team', type: 'org', role: 'supervisor' }, ...userGroupList];
    }
    cache.set(CACHEKEY, JSON.stringify(userGroupList), 60000);
    return userGroupList;
  }
}
