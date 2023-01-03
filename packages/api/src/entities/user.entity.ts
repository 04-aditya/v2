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
} from 'typeorm';
import { UserRoleEntity } from './userrole.entity';
import { hash, compare, compareSync } from 'bcrypt';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { CLID, CLIS, TID, PDAAPI } from '@/config';
import { logger } from '@/utils/logger';
import { AppDataSource } from '@/databases';
import { UserPATEntity } from './userpat.entity';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from '@config';

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
@Tree('closure-table')
export class UserEntity extends BaseEntity implements IUser {
  @PrimaryGeneratedColumn()
  id: number;

  @TreeChildren()
  teams: UserEntity[];

  @TreeParent()
  manager: UserEntity;

  @Column()
  @IsNotEmpty()
  @Unique(['email'])
  email: string;

  @Column('jsonb', { nullable: false, default: {} })
  pdadata: string;

  // @Column({ nullable: true })
  // eid?: string;
  // @Column({ nullable: true })
  // business_title?: string;

  // @Column({ nullable: true })
  // first_name?: string;
  // @Column({ nullable: true })
  // preferred_first_name?: string;
  // @Column({ nullable: true })
  // middle_name?: string;
  // @Column({ nullable: true })
  // last_name?: string;
  // @Column({ nullable: true })
  // preferred_last_name?: string;

  // @Column({ default: 'Fulltime' })
  // employment_type: string;

  // @Column()
  // termination_date: Date;

  // @Column()
  // most_recent_hire_date: Date;

  // @Column()
  // last_promotion_date: Date;

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
    console.log(`Updated User : ${this.id}`);
    AppDataSource.queryResultCache.remove([`user_${this.id}`]);
  }

  async validateCode(code: string) {
    return compare(code, this.verificationCode);
  }
  async setCode(code: string) {
    this.verificationCode = await hash(code, 10);
  }

  toJSON(): IUser {
    return {
      id: this.id,
      email: this.email,
      roles: this.roles?.map(r => r.toJSON()),
    };
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
    const userPermissions = (await this.getPermissions()).values();
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
      for await (const crole of await role.loadChildren()) {
        allroles.set(crole.name, crole);
      }
    }
    this._roles = allroles;
    return this._roles;
  }

  private _permissions: Map<string, IPermission>;
  async getPermissions(ignoreCache = false) {
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
    return { snapshot_date: pdadata.snapshot_date };
  }

  static async getUserById(userId: number | string) {
    return await AppDataSource.getRepository(UserEntity).findOne({
      where: {
        id: parseInt(userId + ''),
      },
    });
  }
  static async CreateUser(email: string, getpdadata = false) {
    const usersRepo = AppDataSource.getRepository(UserEntity);
    const rolesRepo = AppDataSource.getRepository(UserRoleEntity);
    let user = await usersRepo.findOne({ where: { email: email.toLocaleLowerCase() } });
    if (user) {
      throw new Error('Duplicate email: Cannot create another user with the same email');
    }
    user = new UserEntity();
    user.email = email.toLocaleLowerCase();
    const defaultRole = await rolesRepo.findOne({ where: { name: 'default' } });
    user.roles = [defaultRole];
    await user.save();
    if (getpdadata) {
      user.refresh().catch(ex => {
        logger.error(ex);
        logger.warn(`Unable to refresh PDA data for ${user.email}`);
      });
    }
    return user;
  }
}
