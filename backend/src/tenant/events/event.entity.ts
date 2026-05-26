import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../members/member.entity';

export type EventType = 'wedding' | 'death' | 'project' | 'birthday' | 'other';
export type EventStatus = 'proposed' | 'active' | 'closed' | 'cancelled' | 'rejected';

@Entity({ name: 'events' })
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  type: EventType;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'target_amount', type: 'numeric', precision: 12, scale: 2 })
  targetAmount: string;

  /** Date réelle de l'évènement (mariage, cérémonie...). */
  @Column({ name: 'event_date', type: 'date', nullable: true })
  eventDate: Date | null;

  /** Date de clôture des cotisations (échéance) → versement au responsable. */
  @Column({ name: 'deadline', type: 'date' })
  @Index()
  deadline: Date;

  /** Date limite de vote pour une proposition (workflow de décision). */
  @Column({ name: 'decision_deadline', type: 'date', nullable: true })
  decisionDeadline: Date | null;

  @ManyToOne(() => Member, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsible_id' })
  responsible: Member;

  @Column({ name: 'responsible_id' })
  responsibleId: string;

  @ManyToOne(() => Member, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: Member | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'varchar', length: 16, default: 'proposed' })
  status: EventStatus;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'payout_paypal_tx', type: 'varchar', length: 128, nullable: true })
  payoutPaypalTx: string | null;

  /** Remise au responsable : effectuée manuellement par l'admin. */
  @Column({ name: 'payout_status', type: 'varchar', length: 16, default: 'pending' })
  payoutStatus: 'pending' | 'done';

  /** transfer | cash | cheque | paypal | other */
  @Column({ name: 'payout_method', type: 'varchar', length: 16, nullable: true })
  payoutMethod: string | null;

  @Column({ name: 'payout_note', type: 'varchar', length: 255, nullable: true })
  payoutNote: string | null;

  @Column({ name: 'payout_at', type: 'timestamptz', nullable: true })
  payoutAt: Date | null;

  @Column({ name: 'payout_by', type: 'uuid', nullable: true })
  payoutById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
