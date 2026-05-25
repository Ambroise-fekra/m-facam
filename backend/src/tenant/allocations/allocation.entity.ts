import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Member } from '../members/member.entity';
import { Event } from '../events/event.entity';

@Entity({ name: 'allocations' })
@Unique('uq_allocation_event_member', ['eventId', 'memberId'])
export class Allocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Index()
  @Column({ name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Member, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
