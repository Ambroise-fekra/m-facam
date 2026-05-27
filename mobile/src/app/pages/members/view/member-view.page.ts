import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { Member } from '../../../core/models/api.models';

/**
 * Fiche membre en visualisation : reprend exactement les informations affichées
 * sur la ligne dans l'annuaire, mais avec la photo en grand format pour mieux
 * identifier la personne. Le crayon "Modifier" ouvre la page d'édition.
 */
@Component({
  selector: 'app-member-view',
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
        <ion-buttons slot="start"><ion-back-button defaultHref="/members" /></ion-buttons>
        <ion-title>Fiche membre</ion-title>
        <ion-buttons slot="end" *ngIf="canEdit()">
          <a class="edit-top" [routerLink]="['/members', 'edit', member?.id]" title="Modifier le profil">✏️</a>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding" *ngIf="member as m">
      <div class="card">
        <div class="big-avatar">
          <img *ngIf="m.photo" [src]="m.photo" alt="photo" />
          <span *ngIf="!m.photo">{{ initials(m) }}</span>
        </div>

        <h2 class="full-name">{{ m.firstName }} {{ m.lastName }}</h2>

        <div class="badges">
          <span *ngIf="m.role === 'admin'" class="badge badge-proposed">👑 Admin</span>
          <span *ngIf="m.id === auth.snapshot?.member?.id" class="badge badge-active">Vous</span>
          <span *ngIf="m.isBlocked" class="badge badge-rejected">🚫 Bloqué</span>
          <span *ngIf="m.isDeceased" class="badge badge-closed">
            🕯️ Décédé(e)<span *ngIf="m.deceasedAt"> le {{ m.deceasedAt | date: 'dd/MM/yyyy' }}</span>
          </span>
          <span *ngIf="m.isActive === false && !m.isDeceased" class="badge badge-closed">💤 Inactif</span>
        </div>

        <div class="rows">
          <div class="row" *ngIf="auth.isAdmin && m.email">
            <span>✉️ Email</span><strong>{{ m.email }}</strong>
          </div>
          <div class="row" *ngIf="m.phone">
            <span>📱 Téléphone</span><strong>{{ m.phone }}</strong>
          </div>
          <div class="row" *ngIf="m.gender">
            <span>⚧ Sexe</span><strong>{{ genderLabel(m.gender) }}</strong>
          </div>
          <div class="row" *ngIf="m.birthDate">
            <span>🎂 Naissance</span><strong>{{ m.birthDate | date: 'dd/MM/yyyy' }}</strong>
          </div>
          <div class="row" *ngIf="m.fatherName || m.motherName">
            <span>⬆️ Parents</span><strong>{{ parents(m) }}</strong>
          </div>
          <div class="row" *ngIf="m.children?.length">
            <span>⬇️ Enfants</span><strong>{{ childrenNames(m) }}</strong>
          </div>
          <div class="row" *ngIf="m.paypalEmail">
            <span>💳 PayPal</span><strong>{{ m.paypalEmail }}</strong>
          </div>
          <div class="row" *ngIf="m.mobileMoneyNumber">
            <span>📱 {{ operatorLabel(m.mobileMoneyOperator) }}</span><strong>{{ m.mobileMoneyNumber }}</strong>
          </div>
          <div class="row" *ngIf="m.preferredChannel">
            <span>📌 Canal préféré</span><strong>{{ m.preferredChannel === 'paypal' ? 'PayPal' : 'Mobile Money' }}</strong>
          </div>
        </div>

        <p class="status t-muted" *ngIf="m.isBlocked && auth.isAdmin">
          🚫 Prêt impayé à l'échéance.
        </p>
        <p class="status t-muted" *ngIf="!m.canLogin && !m.isDeceased">
          🔒 Ne peut pas se connecter.
        </p>
        <p class="status t-warn" *ngIf="m.hasPendingInvite && !m.isDeceased">
          ⏳ Invitation envoyée, en attente d'activation du mot de passe.
        </p>

        <div class="actions">
          <ion-button *ngIf="m.phone" expand="block" class="wa" (click)="notify(m)">
            💬 Envoyer un message WhatsApp
          </ion-button>
          <ion-button *ngIf="canEdit()" expand="block" fill="outline" [routerLink]="['/members', 'edit', m.id]">
            ✏️ Modifier le profil
          </ion-button>
          <ion-button expand="block" fill="clear" (click)="router.navigateByUrl('/members')">
            ← Retour à la famille
          </ion-button>
        </div>
      </div>
    </ion-content>

    <ion-content class="facam-bg ion-padding" *ngIf="!member && !loadError">
      <p class="t-muted">Chargement…</p>
    </ion-content>

    <ion-content class="facam-bg ion-padding" *ngIf="loadError">
      <p class="t-muted">Membre introuvable.</p>
      <ion-button expand="block" fill="outline" (click)="router.navigateByUrl('/members')">
        ← Retour à la famille
      </ion-button>
    </ion-content>
  `,
  styles: [
    `
      .card { max-width: 520px; margin: 0 auto; }
      .big-avatar {
        width: 100%;
        max-width: 280px;
        aspect-ratio: 1 / 1;
        margin: 8px auto 14px;
        border-radius: 24px;
        background: var(--facam-gradient);
        color: #fff;
        font-weight: 700;
        font-size: 4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,.35);
      }
      .big-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .full-name { color: #fff; text-align: center; margin: 4px 0 6px; font-size: 1.5rem; font-weight: 800; }
      .badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 18px; }
      .rows {
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 16px;
        padding: 4px 14px;
        margin-bottom: 16px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        padding: 11px 0;
        border-bottom: 1px solid rgba(255,255,255,.06);
        color: #94a3b8;
        font-size: .9rem;
      }
      .row:last-child { border-bottom: none; }
      .row strong { color: #fff; text-align: right; word-break: break-word; }
      .status { text-align: center; margin: 12px 0; font-size: .92rem; }
      .status.t-warn { color: #fbbf24; }
      .actions { margin-top: 18px; }
      .actions .wa { --background: #25D366; --background-activated: #1da851; --color: #062e16; font-weight: 700; }
      .edit-top {
        display: inline-flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,.18);
        border-radius: 10px;
        width: 36px; height: 36px;
        margin-right: 8px;
        font-size: 1.05rem;
        text-decoration: none;
        cursor: pointer;
      }
    `,
  ],
})
export class MemberViewPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly whatsapp = inject(WhatsappService);
  readonly auth = inject(AuthService);
  readonly router = inject(Router);

  member: Member | null = null;
  loadError = false;

  ngOnInit() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadError = true;
      return;
    }
    this.loadError = false;
    this.api.members().subscribe({
      next: (all) => {
        const m = all.find((x) => x.id === id) ?? null;
        if (!m) {
          this.loadError = true;
        } else {
          this.member = m;
        }
      },
      error: () => (this.loadError = true),
    });
  }

  canEdit(): boolean {
    const m = this.member;
    if (!m) return false;
    const meId = this.auth.snapshot?.member?.id;
    return this.auth.isAdmin || m.id === meId;
  }

  initials(m: Member) {
    return `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase();
  }

  parents(m: Member) {
    return [m.fatherName, m.motherName].filter(Boolean).join(' · ') || '—';
  }

  childrenNames(m: Member) {
    return (m.children ?? []).map((c) => c.name).join(', ');
  }

  genderLabel(g?: 'M' | 'F' | 'O' | null): string {
    if (g === 'M') return 'Masculin';
    if (g === 'F') return 'Féminin';
    if (g === 'O') return 'Autre';
    return '—';
  }

  operatorLabel(op?: string | null): string {
    const map: Record<string, string> = {
      mtn: 'MTN MoMo',
      orange: 'Orange Money',
      airtel: 'Airtel Money',
      moov: 'Moov Money',
      other: 'Mobile Money',
    };
    return (op && map[op]) || 'Mobile Money';
  }

  notify(m: Member) {
    const fam = this.auth.snapshot?.family.name ?? 'la famille';
    this.whatsapp.share(`Bonjour ${m.firstName}, message de ${fam} (Family Cash Management).`, m.phone);
  }
}
