import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from '../events/event.entity';
import { Member } from '../members/member.entity';

/**
 * One payment made by the borrower towards their loan. Kept separate from
 * normal contributions so it does NOT increase the borrower's share in the
 * caisse — it just offsets the disbursed loan amount.
 */
@Entity({ name: 'loan_repayments' })
export class LoanRepayment {
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

  /** 'transfer' | 'cash' | 'cheque' | 'paypal' | 'other' */
  @Column({ type: 'varchar', length: 16, nullable: true })
  method: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
