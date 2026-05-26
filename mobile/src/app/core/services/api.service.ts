import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Birthday,
  CashSnapshot,
  FamilyEvent,
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

export interface FamilyInfo {
  name: string;
  identifier: string;
  whatsappUrl: string | null;
  paypalEmail: string | null;
  photo: string | null;
}

interface ContributionPayload {
  amount: number;
}

interface AllocationPayload {
  eventId: string;
  amount: number;
}

interface EventCreatePayload {
  type: FamilyEvent['type'];
  title: string;
  description?: string;
  targetAmount: number;
  eventDate?: string;
  deadline: string;
  decisionDeadline?: string;
  responsibleId: string;
}

interface MemberCreatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  paypalEmail?: string;
  fatherId?: string;
  motherId?: string;
  password?: string;
  canLogin?: boolean;
}

interface MemberUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  paypalEmail?: string;
  fatherId?: string;
  motherId?: string;
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
    return this.http.get<{ firstName: string; lastName: string; email: string }>(
      `${this.base}/auth/invite-info?identifier=${encodeURIComponent(identifier)}&token=${encodeURIComponent(token)}`,
    );
  }

  acceptInvite(identifier: string, token: string, password: string) {
    return this.http.post<import('../models/api.models').AuthResponse>(
      `${this.base}/auth/accept-invite`,
      { identifier, token, password },
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
    return this.http.get<{ paypalEmail: string | null; whatsappUrl: string | null; name: string; identifier: string; photo: string | null }>(
      `${this.base}/admin/family`,
    );
  }

  updateFamily(p: { paypalEmail?: string; whatsappUrl?: string; photo?: string }) {
    return this.http.patch<void>(`${this.base}/admin/family`, p);
  }
}
