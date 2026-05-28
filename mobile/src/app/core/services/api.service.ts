import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Birthday,
  CashSnapshot,
  FamilyEvent,
  LoanRepayment,
  Member,
  MyBalance,
  Notification,
  SubscriptionStatus,
  Transaction,
  TreeNode,
  VoteTally,
  VoteValue,
} from '../models/api.models';

interface CreateFamilyPayload {
  code: string;
  name: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  paypalEmail?: string;
  whatsappUrl?: string;
}

export interface MemberMini {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface FamilyInfo {
  name: string;
  identifier: string;
  whatsappUrl: string | null;
  paypalEmail: string | null;
  mobileMoneyNumber?: string | null;
  mobileMoneyOperator?: string | null;
  photo: string | null;
  admin: MemberMini | null;
  chief: MemberMini | null;
  membersCount?: number;
  activeMembersCount?: number;
}

interface ContributionPayload {
  amount: number;
  /** Canal de paiement choisi par le membre (paypal | mobile_money). */
  channel?: 'paypal' | 'mobile_money';
  /** Devise du montant saisi (EUR par défaut). XAF = FCFA BEAC. */
  currency?: 'EUR' | 'XAF';
}

interface AllocationPayload {
  eventId: string;
  amount: number;
}

interface EventCreatePayload {
  type: FamilyEvent['type'];
  title: string;
  description?: string;
  /** Optional except for loans. 0 / undefined = no fixed objective. */
  targetAmount?: number;
  /** Per-member suggested amount (non-loan). */
  suggestedPerMember?: number;
  eventDate?: string;
  deadline: string;
  decisionDeadline?: string;
  responsibleId: string;
  /** Required when type='loan' — the member taking the loan (= the creator). */
  borrowerId?: string;
}

interface MemberCreatePayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  paypalEmail?: string;
  fatherId?: string;
  motherId?: string;
  password?: string;
  canLogin?: boolean;
  /** Surnom (facultatif). */
  nickname?: string;
}

interface MemberUpdatePayload {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  phone?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  paypalEmail?: string;
  fatherId?: string;
  motherId?: string;
  /** True if the member is deceased. Admin/chef only on backend. */
  isDeceased?: boolean;
  /** Optional YYYY-MM-DD ; '' clears. */
  deceasedAt?: string;
  /** Admin/chef only. */
  isActive?: boolean;
  /** Mobile Money personnel. */
  mobileMoneyNumber?: string;
  mobileMoneyOperator?: string;
  /** 'paypal' | 'mobile_money' | '' to clear. */
  preferredChannel?: 'paypal' | 'mobile_money' | '';
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  createFamily(p: CreateFamilyPayload) {
    return this.http.post<{ identifier: string; trial: { endsAt: string } }>(
      `${this.base}/master/families`,
      p,
    );
  }

  recoverIdentifier(email: string) {
    return this.http.post<{ identifiers: string[] }>(`${this.base}/auth/recover-identifier`, { email });
  }

  verifyEmail(token: string) {
    return this.http.post<{ verified: boolean; identifier?: string }>(
      `${this.base}/master/families/verify-email`,
      { token },
    );
  }

  familyInfo() {
    return this.http.get<FamilyInfo>(`${this.base}/members/family-info`);
  }

  myBalance(): Observable<MyBalance> {
    return this.http.get<MyBalance>(`${this.base}/contributions/me/balance`);
  }

  cash(): Observable<CashSnapshot> {
    return this.http.get<CashSnapshot>(`${this.base}/contributions/cash`);
  }

  startContribution(p: ContributionPayload) {
    return this.http.post<{ contributionId: string; approveUrl: string }>(
      `${this.base}/contributions`,
      p,
    );
  }

  /**
   * Admin : enregistre manuellement une cotisation à la caisse pour un membre
   * (versement reçu hors-app en espèces, virement direct, chèque, etc.).
   */
  recordManualContribution(p: {
    memberId: string;
    amount: number;
    method: 'transfer' | 'cash' | 'cheque' | 'paypal' | 'mobile_money' | 'other';
    note?: string;
    /** YYYY-MM-DD pour backdater le versement. */
    dateContributed?: string;
    /** Devise du montant saisi (EUR par défaut). */
    currency?: 'EUR' | 'XAF';
  }) {
    return this.http.post<{ id: string; amount: string }>(`${this.base}/contributions/manual`, p);
  }

  events(): Observable<FamilyEvent[]> {
    return this.http.get<FamilyEvent[]>(`${this.base}/events`);
  }

  event(id: string) {
    return this.http.get<FamilyEvent>(`${this.base}/events/${id}`);
  }

  createEvent(p: EventCreatePayload) {
    return this.http.post<FamilyEvent>(`${this.base}/events`, p);
  }

  vote(eventId: string, value: VoteValue) {
    return this.http.post<{ myVote: VoteValue; tally: VoteTally }>(
      `${this.base}/events/${eventId}/vote`,
      { value },
    );
  }

  myVote(eventId: string) {
    return this.http.get<{ value: VoteValue | null }>(`${this.base}/events/${eventId}/vote/me`);
  }

  activateEvent(eventId: string) {
    return this.http.post<{ status: string }>(`${this.base}/events/${eventId}/activate`, {});
  }

  rejectEvent(eventId: string) {
    return this.http.post<{ status: string }>(`${this.base}/events/${eventId}/reject`, {});
  }

  closeEvent(eventId: string) {
    return this.http.post<FamilyEvent>(`${this.base}/events/${eventId}/close`, {});
  }

  /** Admin / chef de famille : prolonger un évènement et rouvrir s'il était clos sans payout. */
  extendEvent(eventId: string, deadline: string, eventDate?: string | null) {
    return this.http.post<FamilyEvent>(`${this.base}/events/${eventId}/extend`, {
      deadline,
      ...(eventDate !== undefined ? { eventDate } : {}),
    });
  }

  settleEvent(eventId: string, method: string, note?: string) {
    return this.http.post<FamilyEvent>(`${this.base}/events/${eventId}/settle`, { method, note });
  }

  // ---- Loans ----
  recordRepayment(
    eventId: string,
    amount: number,
    method?: string,
    note?: string,
    dateContributed?: string,
    currency?: 'EUR' | 'XAF',
  ) {
    return this.http.post<LoanRepayment>(`${this.base}/events/${eventId}/repayments`, {
      amount, method, note, dateContributed,
      ...(currency ? { currency } : {}),
    });
  }

  listRepayments(eventId: string) {
    return this.http.get<LoanRepayment[]>(`${this.base}/events/${eventId}/repayments`);
  }

  // ---- External events ----
  contributeExternal(
    eventId: string,
    amount: number,
    method?: string,
    note?: string,
    memberId?: string,
    dateContributed?: string,
    currency?: 'EUR' | 'XAF',
  ) {
    return this.http.post(`${this.base}/events/${eventId}/external-contributions`, {
      amount, method, note,
      ...(memberId ? { memberId } : {}),
      ...(dateContributed ? { dateContributed } : {}),
      ...(currency ? { currency } : {}),
    });
  }

  listExternalContributions(eventId: string) {
    return this.http.get<import('../models/api.models').ExternalContribution[]>(
      `${this.base}/events/${eventId}/external-contributions`,
    );
  }

  // ---- Block / unblock (admin) ----
  blockMember(id: string) {
    return this.http.post<{ id: string; isBlocked: boolean }>(`${this.base}/members/${id}/block`, {});
  }
  unblockMember(id: string) {
    return this.http.post<{ id: string; isBlocked: boolean }>(`${this.base}/members/${id}/unblock`, {});
  }

  /** Admin / chef de famille: enable login for a member by generating an invite link. */
  enableMemberLogin(id: string) {
    return this.http.post<{ id: string; inviteToken: string }>(`${this.base}/members/${id}/enable-login`, {});
  }

  /** Any active member can declare their own children. */
  declareDescendant(p: {
    firstName: string;
    lastName: string;
    gender: 'M' | 'F' | 'O';
    birthDate?: string;
    phone?: string;
    email?: string;
  }) {
    return this.http.post<{ id: string }>(`${this.base}/members/descendants`, p);
  }

  /**
   * Déclarer son conjoint actuel. Deux modes :
   *  - spouseId fourni → on lie un membre existant (autres champs ignorés)
   *  - sinon → on crée un nouveau membre (inactif) avec firstName/lastName/gender requis.
   */
  declareSpouse(p: {
    /** Id du membre dont on déclare le conjoint (admin/chef seulement, sinon self). */
    targetMemberId?: string;
    spouseId?: string;
    firstName?: string;
    lastName?: string;
    gender?: 'M' | 'F' | 'O';
    birthDate?: string;
    phone?: string;
    email?: string;
    nickname?: string;
  }) {
    return this.http.post<{ id: string; spouseId: string }>(`${this.base}/members/spouse`, p);
  }

  allocate(p: AllocationPayload) {
    return this.http.post<{ id: string; amount: string }>(`${this.base}/allocations`, p);
  }

  transactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.base}/transactions/me`);
  }

  members(): Observable<Member[]> {
    return this.http.get<Member[]>(`${this.base}/members`);
  }

  me(): Observable<Member> {
    return this.http.get<Member>(`${this.base}/members/me`);
  }

  createMember(p: MemberCreatePayload) {
    return this.http.post<{ id: string; inviteToken: string | null }>(`${this.base}/members`, p);
  }

  updateMember(id: string, p: MemberUpdatePayload) {
    return this.http.patch<Member>(`${this.base}/members/${id}`, p);
  }

  birthdays(): Observable<Birthday[]> {
    return this.http.get<Birthday[]>(`${this.base}/members/birthdays`);
  }

  setMemberPhoto(id: string, photo: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/members/${id}/photo`, { photo });
  }

  inviteInfo(identifier: string, token: string) {
    return this.http.get<{
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      needsEmail: boolean;
    }>(
      `${this.base}/auth/invite-info?identifier=${encodeURIComponent(identifier)}&token=${encodeURIComponent(token)}`,
    );
  }

  acceptInvite(identifier: string, token: string, password: string, email?: string) {
    return this.http.post<import('../models/api.models').AuthResponse>(
      `${this.base}/auth/accept-invite`,
      { identifier, token, password, ...(email ? { email } : {}) },
    );
  }

  notifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/notifications`);
  }

  markNotificationRead(id: string) {
    return this.http.patch<void>(`${this.base}/notifications/${id}/read`, {});
  }

  tree(): Observable<TreeNode[]> {
    return this.http.get<TreeNode[]>(`${this.base}/genealogy/tree`);
  }

  subscription(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(`${this.base}/master/subscriptions/mine`);
  }

  upgradeSubscription() {
    return this.http.post<{ approveUrl: string; priceEur: string }>(
      `${this.base}/master/subscriptions/upgrade`,
      {},
    );
  }

  family() {
    return this.http.get<{
      paypalEmail: string | null;
      whatsappUrl: string | null;
      name: string;
      identifier: string;
      photo: string | null;
      mobileMoneyNumber: string | null;
      mobileMoneyOperator: string | null;
    }>(`${this.base}/admin/family`);
  }

  updateFamily(p: {
    paypalEmail?: string;
    whatsappUrl?: string;
    photo?: string;
    chiefMemberId?: string | null;
    mobileMoneyNumber?: string;
    mobileMoneyOperator?: string;
  }) {
    return this.http.patch<void>(`${this.base}/admin/family`, p);
  }
}
