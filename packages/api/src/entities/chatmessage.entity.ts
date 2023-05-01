import { IChatMessage } from '@sharedtypes';
import { BaseEntity, Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ChatSessionEntity } from './chatsession.entity';
import { th } from 'date-fns/locale';

@Entity({ name: 'chatmessage' })
export class ChatMessageEntity extends BaseEntity implements IChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 0 })
  index: number;

  @Column({ nullable: false })
  role: 'user' | 'system' | 'assistant';

  @Column({ nullable: false })
  content: string;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  options: Record<string, unknown>;

  @ManyToOne(() => ChatSessionEntity, session => session.messages)
  session: ChatSessionEntity;

  @Column()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column()
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  toJSON(): IChatMessage {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      options: this.options,
      index: this.index,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
