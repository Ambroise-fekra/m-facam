import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';
import { AuthFamily, AuthMember, AuthResponse } from '../models/api.models';

interface LoginPayload {
  identifier: string;
  email: string;
  password: string;
}

interface PersistedSession {
  token: string;
  member: AuthMember;
  family: AuthFamily;
}

const SESSION_KEY = 'facam.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly session$ = new BehaviorSubject<PersistedSession | null>(null);
  readonly currentSession = this.session$.asObservable();

  async restore(): Promise<void> {
    const stored = await Preferences.get({ key: SESSION_KEY });
    if (stored.value) {
      this.session$.next(JSON.parse(stored.value));
    }
  }

  get snapshot(): PersistedSession | null {
    return this.session$.value;
  }

  get token(): string | null {
    return this.session$.value?.token ?? null;
  }

  get isAuthenticated(): boolean {
    return !!this.session$.value;
  }

  get isAdmin(): boolean {
    return this.session$.value?.member.role === 'admin';
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, payload)
      .pipe(tap((res) => this.persist(res)));
  }

  async logout(): Promise<void> {
    await Preferences.remove({ key: SESSION_KEY });
    this.session$.next(null);
  }

  /** Persists a session obtained outside of login (e.g. accepting an invite). */
  applySession(res: AuthResponse): Promise<void> {
    return this.persist(res);
  }

  private async persist(res: AuthResponse): Promise<void> {
    const session: PersistedSession = { token: res.token, member: res.member, family: res.family };
    this.session$.next(session);
    await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(session) });
  }
}
