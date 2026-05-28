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

  /** Canal de paiement choisi par le membre ('paypal' | 'mobile_money'). */
  @Column({ type: 'varchar', length: 16, nullable: true })
  channel: 'paypal' | 'mobile_money' | null;

  /**
   * Mode de versement réellement utilisé (transfer | cash | cheque | paypal |
   * mobile_money | other). Renseigné principalement pour les cotisations
   * enregistrées manuellement par l'admin (versement hors-app).
   */
  @Column({ type: 'varchar', length: 16, nullable: true })
  method: string | null;

  /**
   * Qui a enregistré la cotisation : l'admin pour les saisies manuelles,
   * le membre lui-même pour les checkouts in-app.
   */
  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
