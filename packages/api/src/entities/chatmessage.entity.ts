import { IChatMessage } from '@sharedtypes';
import { BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChatSessionEntity } from './chatsession.entity';

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

  @ManyToOne(() => ChatSessionEntity, session => session.messages)
  session: ChatSessionEntity;

  toJSON(): IChatMessage {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      index: this.index,
    };
  }
}
