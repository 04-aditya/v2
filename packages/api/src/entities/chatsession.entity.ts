import { AppDataSource } from '@/databases';
import { logger } from '@/utils/logger';
import { IChatSession } from '@sharedtypes';
import {
  BaseEntity,
  Entity,
  PrimaryColumn,
  Column,
  Index,
  In,
  LessThan,
  Any,
  Between,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatMessageEntity } from './chatmessage.entity';
import { type } from 'os';

@Entity({ name: 'chatsession' })
export class ChatSessionEntity extends BaseEntity implements IChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  userid: string;

  @Column({ nullable: true })
  name: string;

  @Column()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  options: Record<string, unknown>;

  @OneToMany(() => ChatMessageEntity, message => message.session)
  messages: ChatMessageEntity[];

  toJSON(): IChatSession {
    return {
      id: this.id,
      userid: this.userid,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      options: this.options,
      messages: (this.messages || []).map(m => m.toJSON()).sort((a, b) => a.id - b.id),
    };
  }
}
