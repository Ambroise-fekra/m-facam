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
}

export type EventType = 'wedding' | 'death' | 'project' | 'birthday' | 'other';
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
  targetAmount: string;
  eventDate?: string | null;
  deadline: string;
  decisionDeadline?: string | null;
  responsibleId: string;
  responsibleName?: string | null;
  status: EventStatus;
  createdAt?: string;
  closedAt?: string;
  totalCollected: string;
  myAllocation: string;
  tally?: VoteTally | null;
  myVote?: VoteValue | null;
}

export interface MemberChild {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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
  children?: MemberChild[];
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

export interface TreeNode {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  fatherId: string | null;
  motherId: string | null;
  photo: string | null;
  children: TreeNode[];
}
