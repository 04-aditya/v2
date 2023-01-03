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
    const roles = await AppDataSource.getRepository(UserRoleEntity).query(
      `
        WITH RECURSIVE roles AS (
          SELECT * FROM psuserrole WHERE name IN ($1)
          UNION ALL
          SELECT r.* FROM psuserrole r
          INNER JOIN psuserrole p ON p.name = r.name
        ) SELECT * FROM roles;
      `,
      [this.includedRoleNames],
    );
    this.children = roles.map(r => {
      const newrole = new UserRoleEntity();
      AppDataSource.manager.merge(UserRoleEntity, newrole, r);
      return newrole;
    });
    return this.children;
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
    for await (const role of await this.loadChildren()) {
      await role.loadPermissions();
      role.permissions?.forEach(p => perms.set(p.name, p));
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
