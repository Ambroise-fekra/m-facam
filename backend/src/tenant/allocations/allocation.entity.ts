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

  /** Montant canonique en EUR — utilisé pour les soldes et totaux. */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  /** Montant tel que saisi par le membre (XAF possible). */
  @Column({ name: 'original_amount', type: 'numeric', precision: 14, scale: 2, nullable: true })
  originalAmount: string | null;

  @Column({ name: 'original_currency', type: 'varchar', length: 4, nullable: true })
  originalCurrency: 'EUR' | 'XAF' | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
