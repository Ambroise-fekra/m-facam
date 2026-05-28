import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { FamilyEvent } from '../../../core/models/api.models';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/dashboard" /></ion-buttons>
        <ion-title>Évènements</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <ion-button expand="block" routerLink="/events/create" class="ion-margin-bottom">
        + Proposer un évènement
      </ion-button>

      <div class="event-card" *ngFor="let e of events" (click)="router.navigateByUrl('/events/' + e.id)">
        <div class="ev-top">
          <div class="ev-title">{{ emojiFor(e.type) }} {{ e.title }}</div>
          <span class="badge" [ngClass]="badgeClass(e)">{{ statusLabel(e) }}</span>
        </div>
        <div class="ev-meta">
          👤 {{ e.responsibleName }} · 📅 {{ e.eventDate || e.deadline | date: 'dd/MM/yyyy' }}
          <span *ngIf="e.status !== 'proposed' && e.participantsCount != null && e.participantsCount > 0">
            · 👥 {{ e.participantsCount }} {{ participantLabel(e) }}
          </span>
        </div>

        <ng-container *ngIf="e.status === 'proposed'; else fundingTpl">
          <div class="vote-line">
            🗳️ {{ e.tally?.yes || 0 }} oui / {{ e.tally?.no || 0 }} non
            <span class="rule">· Quorum {{ e.tally?.voters || 0 }}/{{ e.tally?.quorumNeeded || 0 }}
              <em>(2/3 sur {{ e.tally?.totalMembers || 0 }})</em>
              · 👥 {{ e.tally?.voters || 0 }} votant(s)
            </span>
            <span *ngIf="e.myVote" class="myvote">— votre vote : {{ e.myVote === 'yes' ? 'OUI' : 'NON' }}</span>
            <span *ngIf="!e.myVote" class="tovote">— à voter</span>
          </div>
        </ng-container>
        <ng-template #fundingTpl>
          <div class="bar-label">💶 Montant</div>
          <div class="facam-progress"><div class="facam-progress-fill" [style.width.%]="ratio(e)"></div></div>
          <div class="ev-amounts">
            <span *ngIf="e.targetAmount">{{ currency.eurXaf(e.totalCollected) }} / {{ currency.eurXaf(e.targetAmount) }}</span>
            <span *ngIf="!e.targetAmount">{{ currency.eurXaf(e.totalCollected) }} collecté(s)</span>
            <span class="mine">{{ e.type === 'external' ? 'ma contrib.' : 'ma part' }} : {{ currency.eurXaf(e.myAllocation) }}</span>
          </div>
          <div class="bar-label">⏳ Temps — {{ daysLeft(e) }} j restants</div>
          <div class="facam-progress"><div class="facam-progress-fill time" [style.width.%]="timeRatio(e)"></div></div>
        </ng-template>
      </div>

      <p *ngIf="!events.length" class="t-muted empty">Aucun évènement pour le moment.</p>
    </ion-content>
  `,
  styles: [
    `
      .event-card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 16px; margin-bottom: 12px; cursor: pointer; }
      .ev-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .ev-title { color: #fff; font-weight: 700; font-size: 1.05rem; }
      .ev-meta { color: #94a3b8; font-size: .85rem; margin: 6px 0 10px; }
      .ev-amounts { display: flex; justify-content: space-between; margin-top: 8px; color: #cbd5e1; font-size: .9rem; }
      .ev-amounts .mine { color: var(--facam-accent); font-weight: 700; }
      .vote-line { color: #cbd5e1; font-size: .9rem; line-height: 1.5; }
      .vote-line .rule { color: #94a3b8; }
      .vote-line .rule em { font-style: normal; opacity: .75; }
      .vote-line .myvote { color: #34d399; font-weight: 700; }
      .vote-line .tovote { color: #fbbf24; font-weight: 700; }
      .empty { text-align: center; padding: 24px; }
    `,
  ],
})
export class EventsListPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly currency = inject(CurrencyService);
  readonly router = inject(Router);
  events: FamilyEvent[] = [];

  ngOnInit() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    this.api.events().subscribe((e) => (this.events = e));
  }

  ratio(e: FamilyEvent) {
    if (!e.targetAmount) return 0;
    const t = Number(e.targetAmount);
    return t > 0 ? Math.min(100, (Number(e.totalCollected) / t) * 100) : 0;
  }

  timeRatio(e: FamilyEvent): number {
    const start = e.createdAt ? new Date(e.createdAt).getTime() : Date.now();
    const end = new Date(e.deadline).getTime();
    if (end <= start) return 100;
    return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
  }

  daysLeft(e: FamilyEvent): number {
    return Math.max(0, Math.ceil((new Date(e.deadline).getTime() - Date.now()) / 86_400_000));
  }

  emojiFor(t: FamilyEvent['type']) {
    return { wedding: '💍', death: '🕯️', project: '🏗️', birthday: '🎂', other: '📌', loan: '💰', external: '🎁' }[t];
  }

  participantLabel(e: FamilyEvent): string {
    if (e.type === 'external') return e.participantsCount === 1 ? 'cotisant' : 'cotisants';
    if (e.type === 'loan') return 'remboursement(s)';
    return e.participantsCount === 1 ? 'allouant' : 'allouants';
  }

  statusLabel(e: FamilyEvent) {
    return { proposed: 'À voter', active: 'Actif', closed: 'Clôturé', cancelled: 'Annulé', rejected: 'Rejeté' }[e.status];
  }

  badgeClass(e: FamilyEvent) {
    return {
      proposed: 'badge-proposed',
      active: 'badge-active',
      closed: 'badge-closed',
      cancelled: 'badge-closed',
      rejected: 'badge-rejected',
    }[e.status];
  }
}
