import { ConfigType, IConfigItem } from '@sharedtypes';
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'config' })
@Index(['name', 'type'], { unique: true })
export class ConfigEntity extends BaseEntity implements IConfigItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: ConfigType,
    default: ConfigType.JSON,
    nullable: false,
  })
  type: ConfigType;

  @Column({ type: 'jsonb', default: {} })
  details: Record<string, any>;

  toJSON(): IConfigItem {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      details: this.details,
    };
  }
}
