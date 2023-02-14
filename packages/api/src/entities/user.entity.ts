import { IPermission, IUser } from 'sharedtypes';
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
  AfterInsert,
  AfterUpdate,
  OneToMany,
  Tree,
  TreeChildren,
  TreeParent,
  SaveOptions,
  Index,
  In,
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
import { parseISO } from 'date-fns';

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
  current_region?: string;

  @Column({ nullable: true })
  home_region?: string;
  // @Column()
  // termination_date: Date;

  @Column({ nullable: true })
  most_recent_hire_date: Date;

  @Column({ nullable: true })
  last_promotion_date: Date;

  @Column({ nullable: true })
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

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

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

  static async getSnapshots() {
    const snapshots = await cache.get(`snapshots`);
    if (snapshots) return snapshots;
    const ss = (await AppDataSource.query(`select distinct snapshot_date from psuser order by snapshot_date desc`)).map((s: any) => s.snapshot_date);
    cache.set(`snapshots`, ss, 60000);
    return ss;
  }

  org?: UserEntity[];
  async loadOrg() {
    // select userid from psuserdata where key='supervisor_id' and CAST(value as INTEGER)=36990 and timestamp<='2023-01-09' group by userid;
    if (this.org) return this.org;
    const users = await AppDataSource.getRepository(UserEntity).query(
      `
      WITH RECURSIVE cte AS (
        SELECT * FROM psuser WHERE supervisor_id = $1 or supervisor_id = $2
        UNION ALL
        SELECT p.* FROM psuser p INNER JOIN cte c ON c.oid = p.supervisor_id or c.csid = p.supervisor_id
      ) SELECT * FROM cte;
      `,
      [this.oid, this.csid],
    );

    // WITH RECURSIVE cte AS ( SELECT * FROM psuser WHERE oid = 36990 or csid = 36990 UNION ALL SELECT p.* FROM psuser p INNER JOIN cte c ON c.oid = p.supervisor_id or c.oid = p.supervisor_id ) SELECT * FROM cte;
    this.org = users.map(u => {
      const newuser = new UserEntity();
      AppDataSource.manager.merge(UserEntity, newuser, u);
      return newuser;
    });
    return this.org;
  }

  static canRead(currentUser: UserEntity, matchedUser: UserEntity, orgUsers: UserEntity[], permissions: string[]): boolean {
    if (matchedUser.id === currentUser.id) return true;
    if (permissions.findIndex(p => p.startsWith('user.read.all')) !== -1) return true;
    if (matchedUser.account === currentUser.account && permissions.findIndex(p => p.startsWith('user.read.client')) !== -1) return true;
    if (matchedUser.team === currentUser.team && permissions.findIndex(p => p.startsWith('user.read.team')) !== -1) return true;
    if (matchedUser.capability === currentUser.capability && permissions.findIndex(p => p.startsWith('user.read.capability')) !== -1) return true;
    if (matchedUser.craft === currentUser.craft && permissions.findIndex(p => p.startsWith('user.read.craft')) !== -1) return true;
    if (permissions.findIndex(p => p.startsWith('user.read.org')) !== -1) {
      if (orgUsers.findIndex(u => u.id === matchedUser.id) !== -1) return true;
    }
    return false;
  }

  static canWrite(currentUser: UserEntity, matchedUser: UserEntity, orgUsers: UserEntity[], permissions: string[]): boolean {
    if (matchedUser.id === currentUser.id) return true;
    if (permissions.findIndex(p => p.startsWith('user.write.all')) !== -1) return true;
    if (matchedUser.account === currentUser.account && permissions.findIndex(p => p.startsWith('user.write.client')) !== -1) return true;
    if (matchedUser.team === currentUser.team && permissions.findIndex(p => p.startsWith('user.write.team')) !== -1) return true;
    if (matchedUser.capability === currentUser.capability && permissions.findIndex(p => p.startsWith('user.write.capability')) !== -1) return true;
    if (matchedUser.craft === currentUser.craft && permissions.findIndex(p => p.startsWith('user.write.craft')) !== -1) return true;
    if (permissions.findIndex(p => p.startsWith('user.write.org')) !== -1) {
      if (orgUsers.findIndex(u => u.id === matchedUser.id) !== -1) return true;
    }
    return false;
  }

  private fieldMap = {
    basic: [
      'oid',
      'csid',
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
      'current_region',
    ],
    get org() {
      return [...this.basic, 'gender', 'most_recent_hire_date'];
    },
    get all() {
      return [...this.basic, this.org];
    },
  };

  toJSON(fieldSet = 'basic'): IUser {
    const result: any = {
      id: this.id,
      oid: this.oid,
      csid: this.csid,
      email: this.email,
      roles: this.roles?.map(r => r.toJSON()),
    };
    let fields = this.fieldMap[fieldSet];
    if (!fields) {
      fields = fieldSet.split(',');
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

  createAccessToken(expiresIn = '1h', patid?: string) {
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
          console.log(pdadata);
        }
      });
    }

    if (!pdadata) {
      logger.error(ar.data);
      throw new Error('Unable to find the record in PDA data');
    }
    this.pdadata = JSON.stringify(pdadata);
    await this.save();
    return { snapshot_date: pdadata.snapshot_date, message: `Updated PDA record for user: ${this.email}` };
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
    let user = await usersRepo.findOne({ where: { email: email.trim().toLocaleLowerCase() } });
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
