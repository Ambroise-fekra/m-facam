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

export type MemberRole = 'admin' | 'member';
export type MemberGender = 'M' | 'F' | 'O';

@Entity({ name: 'members' })
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', length: 80 })
  firstName: string;

  @Column({ name: 'last_name', length: 80 })
  lastName: string;

  // Nullable: deceased relatives added only for the genealogy tree have no email.
  // PostgreSQL allows multiple NULLs under the UNIQUE index.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ name: 'invite_token', type: 'varchar', length: 64, nullable: true })
  inviteToken: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date | null;

  @Column({ type: 'varchar', length: 1, nullable: true })
  gender: MemberGender | null;

  @Column({ type: 'varchar', length: 16, default: 'member' })
  role: MemberRole;

  @Column({ name: 'paypal_email', type: 'varchar', length: 160, nullable: true })
  paypalEmail: string | null;

  @Column({ name: 'avatar_color', type: 'varchar', length: 16, nullable: true })
  avatarColor: string | null;

  @Column({ name: 'photo', type: 'text', nullable: true })
  photo: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'father_id' })
  father: Member | null;

  @Column({ name: 'father_id', type: 'uuid', nullable: true })
  fatherId: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mother_id' })
  mother: Member | null;

  @Column({ name: 'mother_id', type: 'uuid', nullable: true })
  motherId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
