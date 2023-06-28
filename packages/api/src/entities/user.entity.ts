import { IPermission, IUser } from '@sharedtypes';
import { IsNotEmpty } from 'class-validator';
import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  JoinTable,
  ManyToMany,
  AfterUpdate,
  OneToMany,
  Index,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { UserRoleEntity } from './userrole.entity';
import { hash, compare } from 'bcrypt';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { CLID, CLIS, TID, PDAAPI } from '@/config';
import { logger } from '@/utils/logger';
import { AppDataSource } from '@/databases';
import { UserPATEntity } from './userpat.entity';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from '@config';
import cache from '@/utils/cache';
import { intervalToDuration, parse, parseISO } from 'date-fns';
import { groupBy } from '@/utils/util';
import { UserDataEntity } from './userdata.entity';
import { HttpError } from 'routing-controllers';
import { UserGroupEntity } from './usergroup.entity';

const pdaclient = axios.create({
  baseURL: PDAAPI,
  headers: {
    clid: CLID,
    clis: CLIS,
    tid: TID,
  },
});
axiosRetry(pdaclient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: error => {
    console.log(error);
    return true;
  },
});

@Entity({ name: 'psuser' })
export class UserEntity extends BaseEntity implements IUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  supervisor_id: number;

  @Column({ nullable: true })
  supervisor_name: string;

  @Column()
  @IsNotEmpty()
  @Unique(['email'])
  @Index({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Index({ unique: true })
  oid?: number;
  @Column({ nullable: true })
  @Index({ unique: true })
  csid?: number;

  @Column({ nullable: true })
  photo: string;

  @Column('jsonb', { nullable: false, default: {} })
  pdadata: string;

  // @Column({ nullable: true })
  // eid?: string;
  // @Column({ nullable: true })
  // business_title?: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  first_name?: string;
  @Column({ nullable: true })
  middle_name?: string;
  @Column({ nullable: true })
  last_name?: string;

  // @Column({ nullable: true })
  // preferred_first_name?: string;
  // @Column({ nullable: true })
  // preferred_last_name?: string;
  @Column({ default: 'Fulltime' })
  employment_type: string;

  @Column({ nullable: true })
  career_stage: string;

  @Column({ nullable: true })
  business_title: string;

  @Column({ nullable: true })
  capability: string;

  @Column({ nullable: true })
  craft: string;

  @Column({ nullable: true })
  account?: string;

  @Column({ nullable: true })
  team?: string;

  @Column({ nullable: true })
  current_office?: string;

  @Column({ nullable: true })
  current_region?: string;

  @Column({ nullable: true })
  home_office?: string;

  @Column({ nullable: true })
  home_region?: string;
  // @Column()
  // termination_date: Date;

  @Column({ nullable: true })
  most_recent_hire_date: Date;

  @Column({ nullable: true })
  last_promotion_date: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  snapshot_date: Date;
  // @Column()
  // probationary_period_end_date: Date;

  @ManyToMany(() => UserRoleEntity)
  @JoinTable()
  roles: UserRoleEntity[];

  @OneToMany(() => UserPATEntity, pat => pat.user)
  pats: UserPATEntity[];

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ nullable: true })
  refreshTokens: string;

  @Column({ nullable: true })
  accessTokens: string;

  @Column({ nullable: true })
  adtokens: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  data?: Record<string, any> = {};

  @AfterUpdate()
  public handleAfterUpdate() {
    // console.log(`Updated User : ${this.id}`);
    AppDataSource.queryResultCache.remove([`user_${this.id}`]);
  }

  async validateCode(code: string) {
    return compare(code, this.verificationCode);
  }
  async setCode(code: string) {
    this.verificationCode = await hash(code, 10);
  }

  async loadDirects() {
    const directs = await AppDataSource.getRepository(UserEntity).find({
      where: {
        supervisor_id: In([this.oid, this.csid]),
      },
      cache: 60000,
    });
    return directs;
  }

  async loadOrgUserIds(snapshot_date?: Date): Promise<Array<{ userid: number; oid: number; supervisor_id: number }>> {
    const reqdate = snapshot_date ? snapshot_date : (await UserEntity.getSnapshots())[0];
    const CACHEKEY = `orgids_${this.id}_${typeof reqdate === 'string' ? reqdate : reqdate.toISOString()}`;
    const useridjson = await cache.get(CACHEKEY);
    if (useridjson) {
      const userids: Array<{ userid: number; oid: number; csid: number; supervisor_id: number }> = JSON.parse(useridjson as string);
      logger.debug(`get org userids from cache for ${this.oid} on date ${reqdate}`);
      return userids;
    }

    logger.debug(`get org userids from db for ${this.oid} on date ${reqdate}`);
    const userids = await AppDataSource.getRepository(UserEntity).query(
      `
      WITH RECURSIVE cte AS (
        select userid,
          value::jsonb->'oid' as oid,
          value::jsonb->'csid' as csid,
          value::jsonb->'supervisor_id' as supervisor_id
        from psuserdata
        where key='supervisor_id' AND
              (value::jsonb->'supervisor_id'='${this.oid}'::jsonb)
              AND
              timestamp = $1
        UNION ALL
        SELECT
          p.userid,
          p.value::jsonb->'oid' as oid,
          p.value::jsonb->'csid' as csid,
          p.value::jsonb->'supervisor_id' as supervisor_id
        FROM psuserdata p
        INNER JOIN cte c ON c.oid = p.value::jsonb->'supervisor_id'
        WHERE p.key='supervisor_id' and p.timestamp = $1
      ) SELECT * FROM cte;
      `,
      [reqdate],
    );
    await cache.set(CACHEKEY, JSON.stringify(userids), 60000);
    //.then(v => {
    logger.debug('cache set', CACHEKEY);
    //}, console.error);
    return userids;
  }

  async loadOrg(snapshot_date?: Date, groups = ['org:Team']) {
    const userids = await this.loadOrgUserIds(snapshot_date);
    let groupUsers: UserEntity[] = [];
    const orgUsers: UserEntity[] = await AppDataSource.getRepository(UserEntity).find({
      where: {
        id: In(userids.map(u => u.userid)),
      },
    });
    const industries: string[] = [];
    const clients: string[] = [];
    const crafts: string[] = [];
    const capabilities: string[] = [];
    const allowedGroups = await UserGroupEntity.GetGroupsForUser(this);
    if (groups.indexOf('org:Team') !== -1) {
      groupUsers = orgUsers;
    } else if (groups.indexOf('org:Directs') !== -1) {
      groupUsers = orgUsers.filter(u => u.supervisor_id === this.oid || u.supervisor_id === this.csid);
    }

    for await (const industrygroup of groups.filter(g => g.startsWith('industry:'))) {
      const industry = industrygroup.substring('industry:'.length);
      if (!allowedGroups.find(ir => ir.name === industry && ir.type === 'industry'))
        throw new HttpError(403, `Access to industry(${industry}) data is denied`);

      industries.push(industry);
      const iusers: UserEntity[] = await AppDataSource.getRepository(UserEntity).find({
        where: {
          team: industry,
          snapshot_date: MoreThanOrEqual(snapshot_date),
          most_recent_hire_date: LessThanOrEqual(snapshot_date),
        },
        cache: 60000,
      });
      iusers.forEach(iu => {
        if (groupUsers.find(gu => gu.id === iu.id) === undefined) groupUsers.push(iu);
      });
    }

    for await (const clientgroup of groups.filter(g => g.startsWith('client:'))) {
      const client = clientgroup.substring('client:'.length);
      if (!allowedGroups.find(ir => ir.name === client && ir.type === 'client'))
        throw new HttpError(403, `Access to client(${client}) data is denied`);

      clients.push(client);
      const iusers = await AppDataSource.getRepository(UserEntity).find({
        where: {
          account: client,
          snapshot_date: MoreThanOrEqual(snapshot_date),
          most_recent_hire_date: LessThanOrEqual(snapshot_date),
        },
        cache: 60000,
      });
      iusers.forEach(iu => {
        if (groupUsers.find(gu => gu.id === iu.id) === undefined) groupUsers.push(iu);
      });
    }

    for await (const craftgroup of groups.filter(g => g.startsWith('craft:'))) {
      const craft = craftgroup.substring('craft:'.length);
      if (!allowedGroups.find(ir => ir.name === craft && ir.type === 'craft')) throw new HttpError(403, `Access to craft(${craft}) data is denied`);

      crafts.push(craft);
      const iusers = await AppDataSource.getRepository(UserEntity).find({
        where: {
          craft: craft,
          snapshot_date: MoreThanOrEqual(snapshot_date),
          most_recent_hire_date: LessThanOrEqual(snapshot_date),
        },
        cache: 60000,
      });
      iusers.forEach(iu => {
        if (groupUsers.find(gu => gu.id === iu.id) === undefined) groupUsers.push(iu);
      });
    }

    for await (const cpabilitygroup of groups.filter(g => g.startsWith('capability:'))) {
      const capability = cpabilitygroup.substring('capability:'.length);
      if (!allowedGroups.find(ir => ir.name === capability && ir.type === 'capability'))
        throw new HttpError(403, `Access to capability(${capability}) data is denied`);

      capabilities.push(capability);
      const iusers = await AppDataSource.getRepository(UserEntity).find({
        where: {
          capability: capability,
          snapshot_date: MoreThanOrEqual(snapshot_date),
          most_recent_hire_date: LessThanOrEqual(snapshot_date),
        },
        cache: 60000,
      });
      iusers.forEach(iu => {
        if (groupUsers.find(gu => gu.id === iu.id) === undefined) groupUsers.push(iu);
      });
    }

    return {
      users: groupUsers,
      matchedgroups: { industries, clients, crafts, capabilities },
      orgUsers,
      allowedGroups: {
        industries: allowedGroups.filter(g => g.type === 'industry').map(g => g.name),
        clients: allowedGroups.filter(g => g.type === 'client').map(g => g.name),
        crafts: allowedGroups.filter(g => g.type === 'craft').map(g => g.name),
        capabilities: allowedGroups.filter(g => g.type === 'capability').map(g => g.name),
      },
    };
  }

  private fieldMap = {
    get basic() {
      return [
        'oid',
        'csid',
        'photo',
        'first_name',
        'last_name',
        'middle_name',
        'business_title',
        'career_stage',
        'capability',
        'craft',
        'account',
        'team',
        'supervisor_id',
        'supervisor_name',
        'employment_type',
        'current_office',
        'current_region',
      ];
    },
    get org() {
      return [...this.basic, 'most_recent_hire_date'];
    },
    get all() {
      return [...this.org, 'home_office', 'home_region', 'snapshot_date'];
    },
  };

  toJSON(fieldSet = 'basic'): IUser {
    const result: any = {
      id: this.id,
      oid: this.oid,
      csid: this.csid,
      email: this.email,
      roles: this.roles?.map(r => r.toJSON()),
      data: this.data,
    };
    let fields = this.fieldMap[fieldSet];
    if (!fields) {
      fields = fieldSet.split(',').map(f => f.trim().toLowerCase());
      if (fields.length === 0) {
        fields = this.fieldMap['basic'];
      }
    }
    fields.forEach(field => {
      result[field] = this[field];
    });
    return result;
  }

  createRefeshToken(expiresIn = '1d') {
    return jwt.sign({ username: this.id }, REFRESH_TOKEN_SECRET, { expiresIn });
  }

  createAccessToken(expiresIn = '2h', patid?: string) {
    return jwt.sign(
      {
        UserInfo: {
          id: this.id,
          roles: this.roles.map(r => r.name),
          patid,
        },
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn },
    );
  }

  async hasRoleOrPermission(perms: ReadonlyArray<string>): Promise<boolean> {
    for (const role of this.roles) {
      if (perms.includes(role.name)) return true;
    }
    const userPermissions = (await this.getAllPermissions()).values();
    for (const p of userPermissions) {
      for (const reqpermission of perms) {
        if (p.name.startsWith(reqpermission)) return true;
      }
    }
    return false;
  }

  private _roles: Map<string, UserRoleEntity>;
  async getAllRoles(ignoreCache = false): Promise<Map<string, UserRoleEntity>> {
    if (this._roles && !ignoreCache) return this._roles;
    const allroles = new Map<string, UserRoleEntity>();
    for await (const role of this.roles) {
      allroles.set(role.name, role);
      for await (const crole of await role.getAllRoles()) {
        allroles.set(crole.name, crole);
      }
    }
    this._roles = allroles;
    return this._roles;
  }

  private _permissions: Map<string, IPermission>;
  async getAllPermissions(ignoreCache = false) {
    if (this._permissions && !ignoreCache) return this._permissions;

    const perms = new Map<string, IPermission>();

    for await (const role of (await this.getAllRoles()).values()) {
      await role.loadPermissions();
      role.permissions?.forEach(p => perms.set(p.name, p));
    }
    this._permissions = perms;
    return perms;
  }

  async refresh() {
    try {
      logger.debug(`fetching PDA data for ${this.email}`);
      const ar = await pdaclient.post('/getPerson/bySupervisor', {
        supervisorEmail: this.email,
      });

      if (ar.status !== 200) {
        logger.error(ar.data);
        throw new Error('Unable to find the record in PDA data');
      }

      let pdadata: any;
      if (ar.data) {
        (ar.data || []).forEach((emp: any) => {
          if (emp.email_address === this.email) {
            pdadata = emp;
          }
        });
      }

      if (!pdadata) {
        logger.error(ar.data);
        throw new Error('Unable to find the record in PDA data');
      }
      this.pdadata = JSON.stringify(pdadata);

      console.log(pdadata);
      let hasUpdates = false;
      const supervisor = await UserEntity.findOne({ where: { email: pdadata.supervisor_email } });
      this.first_name = pdadata.first_name;
      this.last_name = pdadata.last_name;
      this.capability = pdadata.hrms_2;
      this.craft = pdadata.hrms_3;
      this.most_recent_hire_date = parse(pdadata.most_recent_hire_date, 'MM/dd/yyyy', new Date());
      this.employment_type = pdadata.fte === '1' ? 'FullTime' : 'Contractor';
      this.csid = parseInt(pdadata.career_settings_id);
      // this.oid = parseInt(pdadata.career_settings_id.substring(1), 10);
      if (this.supervisor_id !== supervisor.oid) {
        this.supervisor_name = supervisor.first_name + ', ' + supervisor.last_name;
        this.supervisor_id = supervisor.oid;
        UserDataEntity.create({
          userid: this.id,
          key: 'supervisor_id',
          value: { supervisor_id: supervisor.id, oid: this.oid, csid: this.csid },
          timestamp: supervisor.snapshot_date,
        })
          .save()
          .catch(ex => {
            logger.error(ex);
          });
      }
      this.snapshot_date = supervisor.snapshot_date;
      await this.save();
      return { snapshot_date: pdadata.snapshot_date, message: `Updated PDA record for user: ${this.email}` };
    } catch (ex) {
      logger.error(JSON.stringify(ex));
      throw new Error('Network error in fetching PDA data');
    }
  }

  static UserDataMap = {
    get default() {
      return [
        'client',
        'employment_type',
        'capability',
        'home_region',
        'supervisor_id',
        'career_stage',
        'home_office',
        'craft',
        'team',
        'current_region',
      ];
    },
    get all() {
      return [...this.default];
    },
  };

  async canRead(matchedUser: UserEntity, permissions: string[], orgUsers?: UserEntity[]): Promise<boolean> {
    return UserEntity.canRead(this, matchedUser, permissions, orgUsers);
  }

  async canWrite(matchedUser: UserEntity, permissions: string[], orgUsers?: UserEntity[]): Promise<boolean> {
    return UserEntity.canWrite(this, matchedUser, permissions, orgUsers);
  }

  static async getSnapshots(ignoreCache = false) {
    if (!ignoreCache) {
      const snapshotjson: string = await cache.get(`snapshot_dates`);
      if (snapshotjson) {
        const dates = JSON.parse(snapshotjson);
        return dates.map(d => parseISO(d));
      }
    }
    const ss: Date[] = (await AppDataSource.query(`SELECT DISTINCT timestamp FROM psuserdata WHERE key='supervisor_id' ORDER BY timestamp DESC`)).map(
      (s: any) => s.timestamp,
    );
    cache.set(`snapshot_dates`, JSON.stringify(ss.map((d: Date) => d.toISOString())), 60000);
    return ss;
  }

  static calculatePDAStats(list: UserEntity[]) {
    let avgDirectsCount = 0;
    let fteCount = 0;
    let totalExp = 0;
    let titleExp = 0;
    let diversityCount = 0;

    const csTypes = [
      'Intern',
      'Junior Associate',
      'Associate',
      'Senior Associate',
      'Manager/Specialist',
      'Sr. Manager/Sr. Specialist',
      'Director/Expert',
      'VP/Fellow',
      'Executive',
    ];
    const cs_map = new Map<string, UserEntity[]>();
    const supervisor_map = new Map<string, UserEntity[]>();
    csTypes.forEach(cs => cs_map.set(cs, []));
    list.forEach(u => {
      if (!cs_map.has(u.career_stage)) {
        cs_map.set(u.career_stage, []);
      }
      cs_map.get(u.career_stage).push(u);
      if (!supervisor_map.has(u.supervisor_id + '')) {
        supervisor_map.set(u.supervisor_id + '', []);
      }
      supervisor_map.get(u.supervisor_id + '').push(u);

      if (u.employment_type === 'Fulltime') {
        fteCount++;
      }
      if (u.gender !== 'Male') {
        diversityCount++;
      }
      try {
        const expDuration = intervalToDuration({
          start: u.most_recent_hire_date,
          end: new Date(),
        });
        totalExp += expDuration.years + expDuration.months / 12;
      } catch (ex) {
        logger.error(
          `${__filename} - Cannot calculate Total Experience for user ${u.email},\n most_recent_hire_date ${u.most_recent_hire_date} \n error:${JSON.stringify(ex)}`,
        );
      }

      try {
        const titDuration = intervalToDuration({
          start: u.last_promotion_date || u.most_recent_hire_date,
          end: new Date(),
        });
        titleExp += titDuration.years + titDuration.months / 12;
      } catch (ex) {
        logger.error(
          `${__filename} - Cannot calculate Title Experience for user ${u.email},\n last_promotion_date: ${
            u.last_promotion_date
          }, most_recent_hire_date ${u.most_recent_hire_date} \n error:${JSON.stringify(ex)}`,
        );
      }
    });

    let mpcount = 0;
    for (const [, value] of supervisor_map) {
      avgDirectsCount += value.length;
      mpcount++;
    }

    avgDirectsCount = avgDirectsCount / mpcount;
    return {
      totalCount: list.length,
      cs_map: Array.from(cs_map.entries()).map(([key, value]) => ({ name: key, value: value.length })),
      avgDirectsCount,
      fteCount,
      totalExp,
      titleExp,
      diversityCount,
    };
  }

  static async getPDAStats(snapshot_date: Date): Promise<any> {
    const stats_data = await AppDataSource.getRepository(UserDataEntity).findOne({
      where: {
        userid: 0,
        key: 'pdastats',
        timestamp: snapshot_date,
      },
      cache: 60000,
    });
    if (stats_data) {
      logger.debug(`getting PDAStats from db`);
      return stats_data.value;
    }

    const updated_stats = UserEntity.updatePDAStats(snapshot_date);
    return updated_stats;
  }

  static async updatePDAStats(snapshot_date: Date): Promise<any> {
    logger.info(`Updating PDAstats for ${snapshot_date}`);
    const users: UserEntity[] = await AppDataSource.getRepository(UserEntity).find({
      where: {
        snapshot_date: MoreThanOrEqual(snapshot_date),
        most_recent_hire_date: LessThanOrEqual(snapshot_date),
      },
      cache: 60000,
    });
    logger.info(`Found ${users.length} users for ${snapshot_date}`);

    const account_map = groupBy(users, u => u.account || 'N/A');
    const capability_map = groupBy(users, u => u.capability || 'N/A');
    const craft_map = groupBy(users, u => u.craft || 'N/A');
    const team_map = groupBy(users, u => u.team || 'N/A');

    const pdastatsdata = {
      all: UserEntity.calculatePDAStats(users),
      account: {},
      capability: {},
      craft: {},
      team: {},
    };
    team_map.forEach((v, k) => {
      pdastatsdata.team[k] = UserEntity.calculatePDAStats(v);
    });
    account_map.forEach((v, k) => {
      pdastatsdata.account[k] = UserEntity.calculatePDAStats(v);
    });
    capability_map.forEach((v, k) => {
      pdastatsdata.capability[k] = UserEntity.calculatePDAStats(v);
    });
    craft_map.forEach((v, k) => {
      pdastatsdata.craft[k] = UserEntity.calculatePDAStats(v);
    });
    const udata = await AppDataSource.getRepository(UserDataEntity).findOne({
      where: {
        userid: 0,
        key: 'pdastats',
        timestamp: snapshot_date,
      },
    });

    if (udata) {
      udata.value = pdastatsdata;
      udata.save();
    } else {
      UserDataEntity.Add(0, 'pdastats', pdastatsdata, snapshot_date);
    }
    return pdastatsdata;
  }

  static async canRead(currentUser: UserEntity, matchedUser: UserEntity, permissions: string[], orgUsers?: UserEntity[]): Promise<boolean> {
    try {
      if (matchedUser.id === currentUser.id) return true;
      if (permissions.findIndex(p => p.startsWith('user.read.all')) !== -1) return true;
      if (permissions.findIndex(p => p.startsWith('user.read.org')) !== -1) {
        let team = orgUsers;
        if (!orgUsers) {
          team = (await currentUser.loadOrg()).users;
        }
        logger.debug(`checking is ${matchedUser.email} is in the org(${team.length}) for ${currentUser.email}`);
        if (team.find(u => u.id === matchedUser.id)) return true;
      }
      const groups = await UserGroupEntity.GetGroupsForUser(currentUser);
      let cgroups = groups.filter(g => g.type === 'client' && g.name === matchedUser.account);
      if (cgroups.length > 0) return true;

      cgroups = groups.filter(g => g.type === 'craft' && g.name === matchedUser.craft);
      if (cgroups.length > 0) return true;

      cgroups = groups.filter(g => g.type === 'capability' && g.name === matchedUser.capability);
      if (cgroups.length > 0) return true;

      cgroups = groups.filter(g => g.type === 'industry' && g.name === matchedUser.team);
      if (cgroups.length > 0) return true;
    } catch (ex) {
      console.error(ex);
    }
    return false;
  }

  static async canWrite(currentUser: UserEntity, matchedUser: UserEntity, permissions: string[], orgUsers?: UserEntity[]): Promise<boolean> {
    try {
      if (matchedUser.id === currentUser.id) return true;
      if (permissions.findIndex(p => p.startsWith('user.write.all')) !== -1) return true;
      if (permissions.findIndex(p => p.startsWith('user.write.org')) !== -1) {
        let team = orgUsers;
        if (!orgUsers) {
          team = (await currentUser.loadOrg()).users;
        }
        logger.debug(`checking is ${matchedUser.email} is in the org(${team.length}) for ${currentUser.email}`);
        if (team.find(u => u.id === matchedUser.id)) return true;
      }
      const groups = await UserGroupEntity.GetGroupsForUser(currentUser);
      let cgroups = groups.filter(g => g.type === 'client' && g.name === matchedUser.account);
      if (cgroups.length > 0) return true;

      cgroups = groups.filter(g => g.type === 'craft' && g.name === matchedUser.craft);
      if (cgroups.length > 0) return true;

      cgroups = groups.filter(g => g.type === 'capability' && g.name === matchedUser.capability);
      if (cgroups.length > 0) return true;

      cgroups = groups.filter(g => g.type === 'industry' && g.name === matchedUser.team);
      if (cgroups.length > 0) return true;
    } catch (ex) {
      console.error(ex);
    }
    return false;
  }

  static async getUserById(userId: number | string) {
    const value = userId + '';
    if (value.indexOf('@') > -1) {
      return await AppDataSource.getRepository(UserEntity).findOne({
        where: {
          email: value,
        },
      });
    } else {
      return await AppDataSource.getRepository(UserEntity).findOne({
        where: {
          id: parseInt(value),
        },
      });
    }
  }

  static async CreateUser(email: string, getpdadata = false) {
    const usersRepo = AppDataSource.getRepository(UserEntity);
    const rolesRepo = AppDataSource.getRepository(UserRoleEntity);
    let user = await usersRepo.findOne({ where: { email: email.trim().toLocaleLowerCase() }, relations: { roles: true } });
    if (!user) {
      user = new UserEntity();
      user.email = email.trim().toLocaleLowerCase();
      const defaultRole = await rolesRepo.findOne({ where: { name: 'default' }, cache: 600000 });
      user.roles = [defaultRole];
      await user.save();
    }
    if (getpdadata) {
      user.refresh().catch(ex => {
        logger.error(ex);
        logger.warn(`Unable to refresh PDA data for ${user.email}`);
      });
    }
    return user;
  }
}
