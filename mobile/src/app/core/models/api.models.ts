export interface AuthResponse {
  token: string;
  member: AuthMember;
  family: AuthFamily;
}

export interface AuthMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'member';
}

export interface AuthFamily {
  id: string;
  identifier: string;
  name: string;
  status: 'trial' | 'active' | 'expired' | 'deleted';
}

export interface MyBalance {
  memberId: string;
  totalContributed: string;
  totalAllocated: string;
  balance: string;
}

export interface CashSnapshot {
  totalCash: string;
  totalAllocated: string;
  loansOutstanding?: string;
  loansActiveCount?: number;
  /** Number of distinct members who have at least one completed contribution. */
  contributorsCount?: number;
}

export type EventType = 'wedding' | 'death' | 'project' | 'birthday' | 'other' | 'loan' | 'external';
export type EventStatus = 'proposed' | 'active' | 'closed' | 'cancelled' | 'rejected';
export type VoteValue = 'yes' | 'no';

export interface VoteTally {
  yes: number;
  no: number;
  voters: number;
  totalMembers: number;
  quorumNeeded: number;
  majorityNeeded: number;
  quorumReached: boolean;
  passed: boolean;
}

export interface FamilyEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  /** null = no fixed objective (allowed except for loans). */
  targetAmount: string | null;
  /** Indicative amount each member is suggested to contribute (non-loan). */
  suggestedPerMember?: string | null;
  eventDate?: string | null;
  deadline: string;
  decisionDeadline?: string | null;
  responsibleId: string;
  responsibleName?: string | null;
  /** Coordonnées de paiement du responsable (admin only sur le formulaire de settle). */
  responsiblePayout?: {
    paypalEmail: string | null;
    mobileMoneyNumber: string | null;
    mobileMoneyOperator: string | null;
    preferredChannel: 'paypal' | 'mobile_money' | null;
  } | null;
  borrowerId?: string | null;
  borrowerName?: string | null;
  status: EventStatus;
  createdAt?: string;
  closedAt?: string;
  totalCollected: string;
  myAllocation: string;
  tally?: VoteTally | null;
  myVote?: VoteValue | null;
  payoutStatus?: 'pending' | 'done';
  payoutMethod?: string | null;
  payoutNote?: string | null;
  payoutAt?: string | null;
  /** Distinct contributors to this event's main flow (allocators / external / repayers). */
  participantsCount?: number;
}

export type PayoutMethod = 'transfer' | 'cash' | 'cheque' | 'paypal' | 'other';

export interface MemberChild {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  paypalEmail?: string;
  role: 'admin' | 'member';
  fatherId?: string;
  motherId?: string;
  fatherName?: string | null;
  motherName?: string | null;
  photo?: string | null;
  /** False = "inactive" member: in the family tree but not counted in quorum, can't log in. */
  isActive?: boolean;
  isBlocked?: boolean;
  /** True when the member is deceased (date may be unknown). */
  isDeceased?: boolean;
  /** Optional date of death (YYYY-MM-DD) — may be null when unknown. */
  deceasedAt?: string | null;
  /** True if the member already has a password or a pending invite link. */
  canLogin?: boolean;
  /** True only when the member has actually set a password (pre-requisite to be "actif"). */
  hasPassword?: boolean;
  /** Mobile Money personnel pour recevoir un versement. */
  mobileMoneyNumber?: string | null;
  /** mtn | orange | airtel | moov | other */
  mobileMoneyOperator?: string | null;
  /** 'paypal' | 'mobile_money' | null */
  preferredChannel?: 'paypal' | 'mobile_money' | null;
  children?: MemberChild[];
}

export interface LoanRepayment {
  id: string;
  eventId: string;
  memberId: string;
  amount: string;
  method: string | null;
  note: string | null;
  createdAt: string;
}

export interface ExternalContribution {
  id: string;
  eventId: string;
  memberId: string;
  amount: string;
  method: string | null;
  note: string | null;
  createdAt: string;
}

export interface Birthday {
  id: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  birthDate: string;
  day: number;
  month: number;
  turningAge: number;
  isThisMonth: boolean;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  label: string;
  amount: string;
  createdAt: string;
  reference: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface SubscriptionStatus {
  state: 'trial' | 'active' | 'past_due' | 'cancelled' | 'deleted';
  trialEndsAt: string;
  activeUntil: string | null;
  graceEndsAt: string | null;
  priceEur: string;
}

export interface TreePerson {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F' | 'O' | null;
  birthDate: string | null;
  photo: string | null;
}

export interface TreeUnion {
  partner: TreePerson | null;
  children: TreeNode[];
}

export interface TreeNode {
  person: TreePerson;
  unions: TreeUnion[];
}
