import { AppDataSource } from '@/databases';
import { IUserRole } from 'sharedtypes';
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, In } from 'typeorm';
import { PermissionEntity } from './permission.entity';

@Entity({ name: 'psuserrole' })
export class UserRoleEntity extends BaseEntity implements IUserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('simple-array')
  includedRoleNames: string[];

  children?: UserRoleEntity[];
  async loadChildren() {
    if (this.children) return this.children;
    if (this.includedRoleNames.length === 0) {
      this.children = [];
      return this.children;
    }

    console.log(`fetching includedRoles for ${this.includedRoleNames} for role: ${this.name}`);
    this.children = await AppDataSource.getRepository(UserRoleEntity).find({
      where: {
        name: In(this.includedRoleNames),
      },
      cache: 60000,
    });
    return this.children;
  }

  allRoles?: UserRoleEntity[];
  async getAllRoles() {
    if (this.allRoles) return this.allRoles;
    this.allRoles = [];
    for await (const role of await this.loadChildren()) {
      this.allRoles.push(role);
      this.allRoles.push(...(await role.getAllRoles()));
    }
    return this.allRoles;
  }

  @ManyToMany(() => PermissionEntity)
  @JoinTable()
  permissions: PermissionEntity[];

  async loadPermissions() {
    this.permissions = await AppDataSource.createQueryBuilder().relation(UserRoleEntity, 'permissions').of(this.id).loadMany();
    return this.permissions;
  }

  async getAllPermissions() {
    const perms = new Map<string, PermissionEntity>();
    await this.loadPermissions();
    this.permissions?.forEach(p => perms.set(p.name, p));
    for await (const role of await this.getAllRoles()) {
      const cperms = await role.getAllPermissions();
      cperms.forEach(p => perms.set(p.name, p));
    }
    return perms;
  }

  toJSON(): IUserRole {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      permissions: this.permissions ? this.permissions.map(p => p.toJSON()) : [],
      includedRoleNames: this.includedRoleNames,
    };
  }
}
