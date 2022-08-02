import { IUser } from 'sharedtypes';
import { IsNotEmpty } from 'class-validator';
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, JoinTable, ManyToMany } from 'typeorm';
import { UserRoleEntity } from './userrole.entity';
import { hash, compare } from 'bcrypt';

@Entity({ name: 'psuser' })
export class UserEntity extends BaseEntity implements IUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsNotEmpty()
  @Unique(['email'])
  email: string;

  @Column()
  verificationCode: string;

  @ManyToMany(() => UserRoleEntity)
  @JoinTable()
  roles: UserRoleEntity[];

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  async validateCode(code: string) {
    return compare(code, this.verificationCode);
  }
  async setCode(code: string) {
    this.verificationCode = await hash(code, 10);
  }
}
