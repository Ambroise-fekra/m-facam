import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Family } from '../families/family.entity';

export type SubscriptionState = 'trial' | 'active' | 'past_due' | 'cancelled' | 'deleted';

@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Family, (f) => f.subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_id' })
  family: Family;

  @Column({ name: 'family_id' })
  familyId: string;

  @Column({ type: 'varchar', length: 16, default: 'trial' })
  state: SubscriptionState;

  @Column({ name: 'trial_started_at', type: 'timestamptz' })
  trialStartedAt: Date;

  @Column({ name: 'trial_ends_at', type: 'timestamptz' })
  trialEndsAt: Date;

  @Column({ name: 'active_until', type: 'timestamptz', nullable: true })
  activeUntil: Date | null;

  @Column({ name: 'grace_ends_at', type: 'timestamptz', nullable: true })
  graceEndsAt: Date | null;

  @Column({ name: 'paypal_subscription_id', type: 'varchar', length: 64, nullable: true })
  paypalSubscriptionId: string | null;

  @Column({ name: 'price_eur', type: 'numeric', precision: 8, scale: 2, default: 10 })
  priceEur: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
