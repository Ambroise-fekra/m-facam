import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from '../members/member.entity';

export type NotificationType =
  | 'event_created'
  | 'contribution_received'
  | 'allocation_recorded'
  | 'birthday'
  | 'trial_reminder'
  | 'event_closed_payout';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ type: 'varchar', length: 32 })
  type: NotificationType;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'payload_json', type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
