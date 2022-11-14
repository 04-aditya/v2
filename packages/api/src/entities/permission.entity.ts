import { IPermission } from 'sharedtypes';
import { IsNotEmpty } from 'class-validator';
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'permission' })
export class PermissionEntity extends BaseEntity implements IPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;
}
