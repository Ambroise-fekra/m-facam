import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { FamilyEvent, Member } from '../../../core/models/api.models';

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
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
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
        <p *ngIf="m.nickname" class="nick">« {{ m.nickname }} »</p>

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
          <div class="row" *ngIf="m.spouseName">
            <span>💍 Conjoint(e)</span><strong>{{ m.spouseName }}</strong>
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

        <!-- Versement manuel : admin only, jamais sur un decede -->
        <div class="manual-card" *ngIf="auth.isAdmin && !m.isDeceased">
          <h3 class="h-title">💰 Enregistrer un versement (admin)</h3>
          <p class="t-muted small">
            Pour les versements reçus <strong>hors-app</strong> (espèces, virement direct, chèque…) à crediter à <strong>{{ m.firstName }}</strong>.
          </p>

          <label class="fld-label req">Type</label>
          <ion-select class="fld" interface="alert" [(ngModel)]="versType" (ionChange)="onVersTypeChange()">
            <ion-select-option value="caisse">💰 Cotisation à la caisse familiale</ion-select-option>
            <ion-select-option value="loan">↩️ Remboursement de prêt</ion-select-option>
            <ion-select-option value="external">🎉 Cotisation à un évènement externe</ion-select-option>
          </ion-select>

          <!-- Loan : selecteur du prêt actif où ce membre est emprunteur -->
          <ng-container *ngIf="versType === 'loan'">
            <label class="fld-label req">Prêt en cours</label>
            <ion-select class="fld" interface="alert" [(ngModel)]="versEventId" placeholder="Choisir">
              <ion-select-option *ngFor="let e of borrowerLoans()" [value]="e.id">
                {{ e.title }} — reste {{ currency.eurXaf(remainingOf(e)) }}
              </ion-select-option>
            </ion-select>
            <p class="t-muted small empty" *ngIf="!borrowerLoans().length">
              Ce membre n'a aucun prêt actif en cours. Pas de remboursement à enregistrer.
            </p>
          </ng-container>

          <!-- External : selecteur de l'évènement externe actif -->
          <ng-container *ngIf="versType === 'external'">
            <label class="fld-label req">Évènement externe</label>
            <ion-select class="fld" interface="alert" [(ngModel)]="versEventId" placeholder="Choisir">
              <ion-select-option *ngFor="let e of activeExternalEvents()" [value]="e.id">
                {{ e.title }}
              </ion-select-option>
            </ion-select>
            <p class="t-muted small empty" *ngIf="!activeExternalEvents().length">
              Aucun évènement externe actif. Créez d'abord l'évènement.
            </p>
          </ng-container>

          <ng-container *ngIf="versCanShowForm()">
            <label class="fld-label req">Montant (€)</label>
            <ion-input class="fld" type="number" inputmode="decimal" [(ngModel)]="versAmount" placeholder="50"></ion-input>
            <p class="t-muted small" *ngIf="versAmount > 0">
              ≈ <strong>{{ currency.xaf(versAmount) }}</strong>
            </p>

            <label class="fld-label req">Mode de versement</label>
            <ion-select class="fld" interface="alert" [(ngModel)]="versMethod">
              <ion-select-option value="cash">💵 Espèces</ion-select-option>
              <ion-select-option value="transfer">🏦 Virement bancaire</ion-select-option>
              <ion-select-option value="cheque">📝 Chèque</ion-select-option>
              <ion-select-option value="paypal">💳 PayPal (manuel)</ion-select-option>
              <ion-select-option value="mobile_money">📱 Mobile Money</ion-select-option>
              <ion-select-option value="other">Autre</ion-select-option>
            </ion-select>

            <label class="fld-label">Date du versement <span class="t-muted">(par défaut aujourd'hui)</span></label>
            <ion-input class="fld" type="date" [(ngModel)]="versDate"></ion-input>

            <label class="fld-label">Note</label>
            <ion-input class="fld" [(ngModel)]="versNote" placeholder="Réf., contexte, remis lors de…"></ion-input>

            <ion-button expand="block" class="ion-margin-top" color="success" [disabled]="!versCanSubmit()" (click)="submitManual(m)">
              Enregistrer le versement
            </ion-button>
          </ng-container>
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
      .manual-card {
        margin-top: 22px;
        padding: 16px;
        background: rgba(56,189,248,.08);
        border: 1px solid rgba(56,189,248,.25);
        border-radius: 16px;
      }
      .manual-card h3.h-title { color: #fff; font-size: 1.05rem; margin: 0 0 6px; }
      .manual-card .small { font-size: .82rem; margin: 4px 0 12px; }
      .manual-card .empty { color: #fbbf24; margin: 6px 0 0; }
      .nick { color: #cbd5e1; text-align: center; font-style: italic; margin: -2px 0 8px; }
    `,
  ],
})
export class MemberViewPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly whatsapp = inject(WhatsappService);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);
  readonly auth = inject(AuthService);
  readonly currency = inject(CurrencyService);
  readonly router = inject(Router);

  member: Member | null = null;
  loadError = false;

  /** Liste des évènements (chargée pour les sélecteurs "prêt actif" / "évènement externe"). */
  events: FamilyEvent[] = [];

  // --- Formulaire de versement manuel (admin) ---
  versType: '' | 'caisse' | 'loan' | 'external' = '';
  versEventId = '';
  versAmount = 0;
  versMethod: '' | 'cash' | 'transfer' | 'cheque' | 'paypal' | 'mobile_money' | 'other' = 'cash';
  versDate = '';
  versNote = '';

  ngOnInit() {
    this.load();
    this.loadEventsIfAdmin();
  }

  ionViewWillEnter() {
    this.load();
    this.loadEventsIfAdmin();
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

  private loadEventsIfAdmin() {
    if (!this.auth.isAdmin) return;
    this.api.events().subscribe((list) => (this.events = list));
  }

  /** Prêts actifs où ce membre est l'emprunteur (et où le décaissement a eu lieu). */
  borrowerLoans(): FamilyEvent[] {
    return this.events.filter(
      (e) =>
        e.type === 'loan' &&
        e.status === 'active' &&
        e.payoutStatus === 'done' &&
        e.borrowerId === this.member?.id,
    );
  }

  /** Évènements externes actifs (en collecte). */
  activeExternalEvents(): FamilyEvent[] {
    return this.events.filter((e) => e.type === 'external' && e.status === 'active');
  }

  /** Reste dû d'un prêt (targetAmount - totalCollected qui contient la somme des remboursements). */
  remainingOf(e: FamilyEvent): number {
    const target = parseFloat(e.targetAmount ?? '0');
    const repaid = parseFloat(e.totalCollected ?? '0');
    return Math.max(0, target - repaid);
  }

  onVersTypeChange() {
    // Reset event sélectionné quand on change de type
    this.versEventId = '';
  }

  versCanShowForm(): boolean {
    if (this.versType === 'caisse') return true;
    if (this.versType === 'loan') return !!this.versEventId;
    if (this.versType === 'external') return !!this.versEventId;
    return false;
  }

  versCanSubmit(): boolean {
    return this.versCanShowForm() && this.versAmount > 0 && !!this.versMethod;
  }

  async submitManual(m: Member) {
    if (!this.versCanSubmit()) return;
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
    await loading.present();
    const dateArg = this.versDate || undefined;
    const noteArg = this.versNote || undefined;
    const method = this.versMethod as 'cash' | 'transfer' | 'cheque' | 'paypal' | 'mobile_money' | 'other';

    const obs =
      this.versType === 'caisse'
        ? this.api.recordManualContribution({
            memberId: m.id,
            amount: this.versAmount,
            method,
            note: noteArg,
            dateContributed: dateArg,
          })
        : this.versType === 'loan'
        ? this.api.recordRepayment(this.versEventId, this.versAmount, method, noteArg, dateArg)
        : this.api.contributeExternal(
            this.versEventId,
            this.versAmount,
            method,
            noteArg,
            m.id,
            dateArg,
          );

    obs.subscribe({
      next: async () => {
        await loading.dismiss();
        const t = await this.toastCtrl.create({
          message: `Versement de ${this.versAmount} € enregistré pour ${m.firstName}`,
          color: 'success',
          duration: 2500,
        });
        await t.present();
        // Reset
        this.versAmount = 0;
        this.versEventId = '';
        this.versNote = '';
        this.versDate = '';
        // Reload events to refresh remaining-due on loans
        this.loadEventsIfAdmin();
      },
      error: async (err: unknown) => {
        await loading.dismiss();
        const raw = (err as { error?: { message?: string | string[] } })?.error?.message;
        const msg = Array.isArray(raw) ? raw.join(' ') : raw || 'Échec de l\'enregistrement.';
        const t = await this.toastCtrl.create({ message: String(msg), color: 'danger', duration: 3500 });
        await t.present();
      },
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
