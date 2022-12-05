import { IPermission } from 'sharedtypes';
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'permission' })
export class PermissionEntity extends BaseEntity implements IPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  toJSON(): IPermission {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
    };
  }
}
