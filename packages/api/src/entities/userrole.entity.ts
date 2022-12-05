import { AppDataSource } from '@/databases';
import { IUserRole } from 'sharedtypes';
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, Tree, TreeChildren, TreeParent } from 'typeorm';
import { PermissionEntity } from './permission.entity';

@Entity({ name: 'psuserrole' })
@Tree('closure-table')
export class UserRoleEntity extends BaseEntity implements IUserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @TreeChildren()
  children: UserRoleEntity[];

  @TreeParent()
  parent: UserRoleEntity;

  @ManyToMany(() => PermissionEntity)
  @JoinTable()
  permissions: PermissionEntity[];

  async loadPermissions() {
    this.permissions = await AppDataSource.createQueryBuilder().relation(UserRoleEntity, 'permissions').of(this.id).loadMany();
  }

  toJSON(): IUserRole {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      permissions: this.permissions ? this.permissions.map(p => p.toJSON()) : [],
      children: this.children ? this.children.map(c => c.toJSON()) : undefined,
    };
  }
}
