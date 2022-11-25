import { IUser } from 'sharedtypes';
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
} from 'typeorm';
import { UserRoleEntity } from './userrole.entity';
import { hash, compare } from 'bcrypt';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { CLID, CLIS, TID, PDAAPI } from '@/config';

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

  @Column()
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
      roles: this.roles?.map(r => ({ id: r.id, name: r.name })),
    };
  }

  async refresh() {
    const ar = await pdaclient.post('/getPerson/bySupervisor', {
      supervisorEmail: this.email,
    });

    if (ar.status !== 200) {
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
      throw new Error('Unable to find the record in PDA data');
    }
    this.pdadata = JSON.stringify(pdadata);
    await this.save();
    return { snapshot_date: pdadata.snapshot_date };
  }
}
