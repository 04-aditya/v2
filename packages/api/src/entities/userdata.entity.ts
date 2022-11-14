import { IUserData } from 'sharedtypes';
import { BaseEntity, Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'psuserdata' })
export class UserDataEntity extends BaseEntity implements IUserData {
  @PrimaryColumn()
  userid: number;

  @PrimaryColumn()
  key: string;

  @Column()
  value: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;
}
