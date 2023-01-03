import { IUserPAT } from 'sharedtypes';
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { addDays } from 'date-fns';

const expRe = new RegExp('(\\d+)\\s*d');

@Entity('psuserpat')
export class UserPATEntity extends BaseEntity implements IUserPAT {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  expiration: string;

  @Column('simple-array')
  permissions: string[];

  @Column()
  token: string;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @ManyToOne(() => UserEntity, user => user.pats)
  user: UserEntity;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  toJSON(): IUserPAT {
    const matches = expRe.exec(this.expiration);
    const n = parseInt(matches[1]);
    const token = this.token.substring(0, 4) + '....' + this.token.substring(this.token.length - 4);
    return {
      id: this.id,
      name: this.name,
      expiration: this.expiration,
      createdAt: this.createdAt,
      expiresAt: addDays(this.createdAt, n),
      permissions: this.permissions,
      lastUsedAt: this.lastUsedAt,
      token,
    };
  }
}
