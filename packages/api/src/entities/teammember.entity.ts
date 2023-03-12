import { AppDataSource } from '@/databases';
import { ITeamMember, IUser } from '@sharedtypes';
import { BaseEntity, Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'teammember' })
export class TeamMemberEntity extends BaseEntity implements ITeamMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity)
  @JoinTable()
  user: UserEntity;

  @Column({ default: '' })
  role: string;

  @Column({ type: 'jsonb', default: {} })
  details?: Record<string, any>;

  toJSON(): ITeamMember {
    return {
      id: this.id,
      user: this.user?.toJSON('first_name, last_name, business_title'),
      role: this.role,
      details: this.details,
    };
  }

  // this function is used to add a temmember
  // e.g. TeamMemberEntity.Add(1, 'admin')
  static async Add(userid, role) {
    const newTeamMember = new TeamMemberEntity();
    newTeamMember.user = await UserEntity.getUserById(userid);
    newTeamMember.role = role;
    await newTeamMember.save();
    return newTeamMember;
  }
}
