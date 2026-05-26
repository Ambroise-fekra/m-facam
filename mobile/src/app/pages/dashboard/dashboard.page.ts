import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  walletOutline,
  peopleOutline,
  sparklesOutline,
  statsChartOutline,
  notificationsOutline,
  logOutOutline,
} from 'ionicons/icons';
import { ApiService, FamilyInfo } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CashSnapshot, FamilyEvent, MyBalance } from '../../core/models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButton, IonButtons],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <img slot="start" src="assets/alicsia-icon.png" alt="ALICSIA" class="hdr-logo" (error)="onLogoError($event)" />
        <ion-title>Family Cash</ion-title>
        <ion-buttons slot="end">
          <ion-button class="hdr-btn" (click)="router.navigateByUrl('/notifications')">🔔</ion-button>
          <ion-button class="hdr-btn" (click)="router.navigateByUrl('/help')">Aide</ion-button>
          <ion-button class="hdr-btn logout-top" fill="solid" color="danger" (click)="logout()">Déconnexion</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <p class="greet">Bonjour {{ auth.snapshot?.member?.firstName }} 👋</p>
      <p class="family">Famille {{ info?.name ?? auth.snapshot?.family?.name }}</p>

      <div class="fam-card" *ngIf="info">
        <div class="fam-row" *ngIf="info.admin">
          <span class="fam-role">👑 Admin</span>
          <span class="fam-name">{{ info.admin.firstName }} {{ info.admin.lastName }}</span>
          <a class="fam-phone" *ngIf="info.admin.phone" [href]="'tel:' + info.admin.phone">📞 {{ info.admin.phone }}</a>
          <span class="fam-phone muted" *ngIf="!info.admin.phone">—</span>
        </div>
        <div class="fam-row" *ngIf="info.chief">
          <span class="fam-role">⭐ Chef de famille</span>
          <span class="fam-name">{{ info.chief.firstName }} {{ info.chief.lastName }}</span>
          <a class="fam-phone" *ngIf="info.chief.phone" [href]="'tel:' + info.chief.phone">📞 {{ info.chief.phone }}</a>
          <span class="fam-phone muted" *ngIf="!info.chief.phone">—</span>
        </div>
        <div class="fam-row no-chief" *ngIf="!info.chief && auth.isAdmin">
          ⭐ <a (click)="router.navigateByUrl('/members')">Désigner un chef de famille →</a>
        </div>
      </div>

      <p class="byline">Family Cash Management — By ALICSIA (Ambroise Fouti LOEMBA)</p>

      <!-- Caisse familiale en premier, en grand -->
      <div class="cash-card">
        <span class="label">💰 Caisse familiale (disponible)</span>
        <span class="facam-balance-amount">{{ cash?.totalCash ?? '—' }} €</span>
        <div class="loans-out" *ngIf="hasOutstandingLoans()">
          <span>💸 Reste à rembourser sur prêt(s) en cours</span>
          <strong>{{ cash?.loansOutstanding }} €</strong>
        </div>
        <p class="loans-note" *ngIf="hasOutstandingLoans()">
          {{ cash?.loansActiveCount }} prêt(s) actif(s) — déjà décaissé(s) de la caisse, en attente de remboursement.
        </p>
        <div class="myshare">
          <span>Votre part dans la caisse</span>
          <strong>{{ balance?.balance ?? '—' }} €</strong>
        </div>
        <div class="myshare sub">
          <span>Total cotisé / alloué</span>
          <strong>{{ balance?.totalContributed ?? '0' }} € / {{ balance?.totalAllocated ?? '0' }} €</strong>
        </div>
      </div>

      <div class="actions">
        <div class="action" (click)="router.navigateByUrl('/contribute')">
          <ion-icon name="wallet-outline" /><span>Cotiser</span>
        </div>
        <div class="action" (click)="router.navigateByUrl('/events')">
          <ion-icon name="sparkles-outline" /><span>Évènements</span>
        </div>
        <div class="action" (click)="router.navigateByUrl('/members')">
          <ion-icon name="people-outline" /><span>Famille</span>
        </div>
        <div class="action" (click)="router.navigateByUrl('/transactions')">
          <ion-icon name="stats-chart-outline" /><span>Transactions</span>
        </div>
      </div>

      <div class="section-head">
        <h2>Évènements actifs</h2>
        <a (click)="router.navigateByUrl('/events')">Voir tout →</a>
      </div>

      <div class="event-card" *ngFor="let e of activeEvents" (click)="router.navigateByUrl('/events/' + e.id)">
        <div class="ev-top">
          <div class="ev-title">{{ emojiFor(e.type) }} {{ e.title }}</div>
          <span class="badge badge-active">Actif</span>
        </div>
        <div class="ev-meta">👤 {{ e.responsibleName }} · 📅 {{ e.eventDate || e.deadline | date: 'dd/MM/yyyy' }}</div>

        <div class="bar-label" *ngIf="e.targetAmount">💶 Montant</div>
        <div class="facam-progress" *ngIf="e.targetAmount"><div class="facam-progress-fill" [style.width.%]="ratio(e)"></div></div>
        <div class="ev-amounts">
          <span *ngIf="e.targetAmount">{{ e.totalCollected }} € / {{ e.targetAmount }} €</span>
          <span *ngIf="!e.targetAmount">{{ e.totalCollected }} € collecté(s)</span>
          <span class="mine">{{ e.type === 'external' ? 'ma contrib.' : 'ma part' }} : {{ e.myAllocation }} €</span>
        </div>

        <div class="bar-label">⏳ Temps — {{ daysLeft(e) }} j restants</div>
        <div class="facam-progress"><div class="facam-progress-fill time" [style.width.%]="timeRatio(e)"></div></div>
      </div>

      <div *ngIf="proposedCount > 0" class="vote-banner" (click)="router.navigateByUrl('/events')">
        🗳️ {{ proposedCount }} proposition(s) en attente de votre vote
      </div>

      <p *ngIf="!activeEvents.length && !proposedCount" class="t-muted empty">Aucun évènement actif.</p>

      <ion-button expand="block" color="danger" class="logout" (click)="logout()">
        🚪 Se déconnecter
      </ion-button>
    </ion-content>
  `,
  styles: [
    `
      .hdr-btn { --color: #ffffff; font-weight: 700; }
      .logout-top { --border-radius: 10px; }
      .hdr-logo { width: 30px; height: 30px; object-fit: contain; margin-left: 12px; background: #fff; border-radius: 7px; padding: 3px; }
      .greet { color: #cbd5e1; font-size: 1.05rem; margin: 4px 0 0; }
      .family { color: #fff; font-size: 1.5rem; font-weight: 800; margin: 0 0 6px; }
      .fam-card { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 8px 12px; margin-bottom: 10px; }
      .fam-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 4px 0; color: #cbd5e1; font-size: .88rem; }
      .fam-role { color: #94a3b8; min-width: 130px; font-weight: 600; }
      .fam-name { color: #fff; font-weight: 700; }
      .fam-phone { color: var(--facam-accent); text-decoration: none; font-weight: 600; }
      .fam-phone.muted { color: #64748b; font-weight: 400; }
      .no-chief a { color: var(--facam-accent); cursor: pointer; text-decoration: underline; }
      .byline { color: #94a3b8; font-size: .78rem; margin: 0 0 16px; }
      .cash-card { background: var(--facam-gradient-soft); border: 1px solid rgba(99,102,241,.3); border-radius: 22px; padding: 22px; }
      .cash-card .label { display: block; color: #cbd5e1; font-size: .85rem; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
      .loans-out { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 8px 10px; border-radius: 10px; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.30); color: #fde68a; }
      .loans-out strong { color: #fbbf24; font-size: 1.15rem; }
      .loans-note { color: #94a3b8; font-size: .78rem; margin: 4px 2px 0; line-height: 1.4; }
      .myshare { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; color: #e2e8f0; }
      .myshare strong { color: #fff; font-size: 1.25rem; font-weight: 800; }
      .myshare.sub { margin-top: 8px; color: #94a3b8; font-size: .85rem; }
      .myshare.sub strong { font-size: .95rem; color: #cbd5e1; font-weight: 600; }
      .actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
      .action { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 14px 6px; text-align: center; color: #fff; cursor: pointer; }
      .action ion-icon { font-size: 1.7rem; color: var(--facam-accent); }
      .action span { display: block; margin-top: 6px; font-size: .8rem; font-weight: 600; }
      .section-head { display: flex; justify-content: space-between; align-items: center; margin: 18px 0 10px; }
      .section-head h2 { color: #fff; font-size: 1.1rem; margin: 0; }
      .section-head a { color: var(--ion-color-primary); font-size: .9rem; }
      .event-card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 16px; margin-bottom: 12px; cursor: pointer; }
      .ev-top { display: flex; justify-content: space-between; align-items: center; }
      .ev-title { color: #fff; font-weight: 700; font-size: 1.05rem; }
      .ev-meta { color: #94a3b8; font-size: .85rem; margin: 6px 0 10px; }
      .ev-amounts { display: flex; justify-content: space-between; margin-top: 8px; color: #cbd5e1; font-size: .9rem; }
      .ev-amounts .mine { color: var(--facam-accent); font-weight: 700; }
      .bar-label { color: #94a3b8; font-size: .75rem; margin: 8px 0 4px; }
      .vote-banner { background: rgba(245,158,11,.15); border: 1px solid rgba(245,158,11,.35); color: #fbbf24; border-radius: 14px; padding: 14px; text-align: center; font-weight: 600; margin-top: 8px; cursor: pointer; }
      .empty { text-align: center; padding: 24px; }
      .logout { margin-top: 22px; margin-bottom: 12px; font-weight: 700; }
    `,
  ],
})
export class DashboardPage implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly router = inject(Router);

  balance: MyBalance | null = null;
  cash: CashSnapshot | null = null;
  info: FamilyInfo | null = null;
  activeEvents: FamilyEvent[] = [];
  proposedCount = 0;

  constructor() {
    addIcons({ walletOutline, peopleOutline, sparklesOutline, statsChartOutline, notificationsOutline, logOutOutline });
  }

  ngOnInit() {
    forkJoin({
      balance: this.api.myBalance(),
      cash: this.api.cash(),
      events: this.api.events(),
      info: this.api.familyInfo(),
    }).subscribe(({ balance, cash, events, info }) => {
      this.balance = balance;
      this.cash = cash;
      this.info = info;
      this.activeEvents = events.filter((e) => e.status === 'active').slice(0, 5);
      this.proposedCount = events.filter((e) => e.status === 'proposed').length;
    });
  }

  ratio(e: FamilyEvent): number {
    if (!e.targetAmount) return 0;
    const t = Number(e.targetAmount);
    return t > 0 ? Math.min(100, (Number(e.totalCollected) / t) * 100) : 0;
  }

  timeRatio(e: FamilyEvent): number {
    const start = e.createdAt ? new Date(e.createdAt).getTime() : Date.now();
    const end = new Date(e.deadline).getTime();
    const now = Date.now();
    if (end <= start) return 100;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }

  daysLeft(e: FamilyEvent): number {
    return Math.max(0, Math.ceil((new Date(e.deadline).getTime() - Date.now()) / 86_400_000));
  }

  emojiFor(t: FamilyEvent['type']) {
    return { wedding: '💍', death: '🕯️', project: '🏗️', birthday: '🎂', other: '📌', loan: '💰', external: '🎁' }[t];
  }

  hasOutstandingLoans(): boolean {
    return !!this.cash && Number(this.cash.loansOutstanding ?? '0') > 0;
  }

  onLogoError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/auth/login');
  }
}
