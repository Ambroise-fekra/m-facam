import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Subscription } from '../subscriptions/subscription.entity';

export type FamilyStatus = 'trial' | 'active' | 'expired' | 'deleted';

@Entity({ name: 'families' })
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  identifier: string;

  @Column({ length: 128 })
  name: string;

  @Column({ name: 'db_name', length: 96, unique: true })
  dbName: string;

  @Column({ name: 'admin_email', length: 160 })
  adminEmail: string;

  @Column({ name: 'paypal_email', type: 'varchar', length: 160, nullable: true })
  paypalEmail: string | null;

  @Column({ name: 'whatsapp_url', type: 'varchar', length: 255, nullable: true })
  whatsappUrl: string | null;

  @Column({ type: 'varchar', length: 16, default: 'trial' })
  status: FamilyStatus;

  @Column({ name: 'admin_email_verified', type: 'boolean', default: false })
  adminEmailVerified: boolean;

  @Column({ name: 'email_verify_token', type: 'varchar', length: 64, nullable: true })
  emailVerifyToken: string | null;

  @Column({ name: 'photo', type: 'text', nullable: true })
  photo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Subscription, (s) => s.family)
  subscription: Subscription;
}
