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

export type ContributionStatus = 'pending' | 'completed' | 'failed';

@Entity({ name: 'contributions' })
export class Contribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ name: 'member_id' })
  memberId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'paypal_tx_id', type: 'varchar', length: 128, nullable: true })
  paypalTxId: string | null;

  @Column({ name: 'paypal_payer_email', type: 'varchar', length: 160, nullable: true })
  paypalPayerEmail: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: ContributionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
