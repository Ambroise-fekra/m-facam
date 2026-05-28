import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
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
import { ApiService, FamilyInfo } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { FamilyEvent, MyBalance, VoteValue } from '../../../core/models/api.models';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
        <ion-buttons slot="start"><ion-back-button defaultHref="/events" /></ion-buttons>
        <ion-title>{{ event?.title ?? 'Évènement' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding" *ngIf="event">
      <div class="head">
        <h2 class="h-title">{{ emojiFor(event.type) }} {{ event.title }}</h2>
        <span class="badge" [ngClass]="badgeClass()">{{ statusLabel() }}</span>
      </div>
      <p class="t-muted" *ngIf="event.description">{{ event.description }}</p>

      <!-- Loan banner -->
      <div class="facam-card loan-banner" *ngIf="event.type === 'loan'">
        💰 <strong>Prêt</strong> de <strong>{{ currency.eurXaf(event.targetAmount) }}</strong>
        à <strong>{{ event.borrowerName }}</strong>
        — échéance de remboursement le <strong>{{ event.deadline | date: 'dd/MM/yyyy' }}</strong>.
      </div>

      <!-- Dates -->
      <div class="facam-card dates">
        <div class="row"><span>🗓️ Créé le</span><strong>{{ event.createdAt | date: 'dd/MM/yyyy' }}</strong></div>
        <div class="row"><span>🎉 Date de l'évènement</span><strong>{{ event.eventDate ? (event.eventDate | date: 'dd/MM/yyyy') : '—' }}</strong></div>
        <div class="row"><span>💰 Clôture des cotisations</span><strong>{{ event.deadline | date: 'dd/MM/yyyy' }}</strong></div>
        <div class="row" *ngIf="event.status === 'proposed'"><span>🗳️ Fin du vote</span><strong>{{ event.decisionDeadline | date: 'dd/MM/yyyy' }}</strong></div>
        <div class="row"><span>👤 Responsable</span><strong>{{ event.responsibleName }}</strong></div>
        <div class="row" *ngIf="event.status === 'proposed' && event.tally">
          <span>👥 Votants</span><strong>{{ event.tally.voters }} / {{ event.tally.totalMembers }}</strong>
        </div>
        <div class="row" *ngIf="event.status !== 'proposed' && (event.participantsCount ?? 0) > 0">
          <span>👥 {{ participantLabelFull() }}</span><strong>{{ event.participantsCount }}</strong>
        </div>
      </div>

      <ion-button expand="block" fill="outline" class="wa" (click)="announce()">💬 Annoncer sur WhatsApp</ion-button>

      <!-- VOTING (proposed) -->
      <div class="facam-card" *ngIf="event.status === 'proposed'">
        <h3 class="h-title">🗳️ Vote de la famille</h3>
        <p class="t-muted small">Vote anonyme · modifiable jusqu'à l'échéance.</p>
        <div class="tally">
          <div class="t-yes">✅ {{ event.tally?.yes || 0 }} OUI</div>
          <div class="t-no">❌ {{ event.tally?.no || 0 }} NON</div>
        </div>
        <div class="rule-line" *ngIf="event.tally">
          <span>📊 <strong>Quorum</strong> : {{ event.tally.voters }}/{{ event.tally.quorumNeeded }}
            <em>(2/3 des {{ event.tally.totalMembers }} membres actifs)</em></span>
          <span class="check">{{ event.tally.quorumReached ? '✅' : '❌' }}</span>
        </div>
        <div class="rule-line" *ngIf="event.tally">
          <span>🎯 <strong>Majorité</strong> : {{ event.tally.yes }}/{{ event.tally.majorityNeeded }} OUI
            <em>(2/3 des votants exprimés)</em></span>
          <span class="check">{{ event.tally.yes >= event.tally.majorityNeeded && event.tally.voters > 0 ? '✅' : '❌' }}</span>
        </div>
        <div class="rule-line state" *ngIf="event.tally">
          <span>{{ event.tally.passed ? '✅ Proposition adoptée' : (event.tally.voters > 0 ? '⏳ En attente' : '⏳ Aucun vote') }}</span>
        </div>
        <div class="borrower-note" *ngIf="event.type === 'loan' && event.borrowerId === auth.snapshot?.member?.id">
          ℹ️ Vous êtes l'<strong>emprunteur</strong> : vous ne pouvez pas voter sur votre propre demande de prêt.
        </div>
        <div class="vote-btns" *ngIf="!(event.type === 'loan' && event.borrowerId === auth.snapshot?.member?.id)">
          <ion-button expand="block" [fill]="myVote === 'yes' ? 'solid' : 'outline'" color="success" (click)="castVote('yes')">
            {{ myVote === 'yes' ? '✓ ' : '' }}Pour
          </ion-button>
          <ion-button expand="block" [fill]="myVote === 'no' ? 'solid' : 'outline'" color="danger" (click)="castVote('no')">
            {{ myVote === 'no' ? '✓ ' : '' }}Contre
          </ion-button>
        </div>

        <div *ngIf="auth.isAdmin" class="admin-box">
          <p class="t-muted small">Administrateur — décision directe (cas urgent) :</p>
          <div class="vote-btns">
            <ion-button expand="block" color="success" (click)="adminActivate()">Activer maintenant</ion-button>
            <ion-button expand="block" fill="outline" color="medium" (click)="adminReject()">Rejeter</ion-button>
          </div>
        </div>
      </div>

      <!-- FUNDING (active, non-loan) — both classical and external share this header card -->
      <ng-container *ngIf="event.status === 'active' && event.type !== 'loan'">
        <div class="facam-card">
          <div class="row" *ngIf="event.targetAmount"><span>🎯 Objectif</span><strong>{{ currency.eurXaf(event.targetAmount) }}</strong></div>
          <div class="row" *ngIf="!event.targetAmount"><span>🎯 Objectif</span><strong class="t-muted">Pas d'objectif fixé</strong></div>
          <div class="row" *ngIf="event.suggestedPerMember"><span>💡 Suggéré par membre</span><strong class="t-accent">{{ currency.eurXaf(event.suggestedPerMember) }}</strong></div>
          <div class="row"><span>💶 Collecté</span><strong>{{ currency.eurXaf(event.totalCollected) }}</strong></div>
          <div class="row"><span>🙋 {{ event.type === 'external' ? 'Ma contribution' : 'Ma part (privée)' }}</span><strong class="t-accent">{{ currency.eurXaf(event.myAllocation) }}</strong></div>
          <div class="bar-label" *ngIf="event.targetAmount">💶 Avancement</div>
          <div class="facam-progress" *ngIf="event.targetAmount"><div class="facam-progress-fill" [style.width.%]="ratio()"></div></div>
          <div class="bar-label">⏳ Temps avant clôture — {{ daysLeft() }} j restants</div>
          <div class="facam-progress"><div class="facam-progress-fill time" [style.width.%]="timeRatio()"></div></div>
        </div>

        <!-- Classical event: allocate from share -->
        <div class="facam-card" *ngIf="event.type !== 'external'">
          <h3 class="h-title">Allouer depuis mon solde</h3>
          <p class="t-muted small" *ngIf="balance">Solde disponible : {{ currency.eurXaf(balance.balance) }}</p>
          <label class="fld-label">Montant à allouer (€)</label>
          <ion-input class="fld" type="number" inputmode="decimal" [(ngModel)]="amount" placeholder="0"></ion-input>
          <ion-button expand="block" class="ion-margin-top" [disabled]="!canAllocate()" (click)="allocate()">
            Confirmer l'allocation
          </ion-button>
        </div>

        <!-- External event: targeted contribution (no share involved) -->
        <div class="facam-card" *ngIf="event.type === 'external'">
          <h3 class="h-title">🎁 Cotiser ciblé sur cet évènement</h3>
          <p class="t-muted small">
            Votre cotisation va <strong>directement</strong> à cet évènement — elle <strong>ne touche pas votre part</strong> dans la caisse familiale.
          </p>
          <label class="fld-label req">Montant (€)</label>
          <ion-input class="fld" type="number" inputmode="decimal" [(ngModel)]="extAmount" [placeholder]="event.suggestedPerMember || '0'"></ion-input>
          <label class="fld-label">Mode (optionnel)</label>
          <ion-select class="fld" interface="alert" [(ngModel)]="extMethod" placeholder="Choisir">
            <ion-select-option value="transfer">Virement bancaire</ion-select-option>
            <ion-select-option value="cash">Espèces</ion-select-option>
            <ion-select-option value="cheque">Chèque</ion-select-option>
            <ion-select-option value="paypal">PayPal</ion-select-option>
            <ion-select-option value="mobile_money">Mobile Money</ion-select-option>
            <ion-select-option value="other">Autre</ion-select-option>
          </ion-select>
          <label class="fld-label">Note</label>
          <ion-input class="fld" [(ngModel)]="extNote" placeholder="Réf., date…"></ion-input>
          <ion-button expand="block" color="success" class="ion-margin-top" [disabled]="!canContributeExt()" (click)="contributeExt()">
            Enregistrer ma contribution
          </ion-button>
        </div>

        <div class="facam-card" *ngIf="auth.isAdmin">
          <p class="t-muted small">Administrateur : si les fonds sont prêts, vous pouvez clôturer maintenant (sinon clôture automatique à l'échéance).</p>
          <ion-button expand="block" fill="outline" color="warning" (click)="closeNow()">🏁 Clôturer maintenant</ion-button>
        </div>
      </ng-container>

      <!-- LOAN active : suivi des remboursements (pas d'allocation) -->
      <ng-container *ngIf="event.status === 'active' && event.type === 'loan'">
        <div class="facam-card">
          <div class="row"><span>💰 Montant prêté</span><strong>{{ currency.eurXaf(event.targetAmount) }}</strong></div>
          <div class="row"><span>↩️ Remboursé</span><strong>{{ currency.eurXaf(event.totalCollected) }}</strong></div>
          <div class="row"><span>⏳ Reste dû</span><strong class="t-accent">{{ currency.eurXaf(remainingLoan()) }}</strong></div>
          <div class="bar-label">↩️ Remboursement</div>
          <div class="facam-progress"><div class="facam-progress-fill" [style.width.%]="ratio()"></div></div>
          <div class="bar-label">⏳ Temps avant échéance — {{ daysLeft() }} j restants</div>
          <div class="facam-progress"><div class="facam-progress-fill time" [style.width.%]="timeRatio()"></div></div>
        </div>

        <!-- Disbursement pending → reuse existing settle UI (admin) -->
        <div class="facam-card pending" *ngIf="event.payoutStatus !== 'done' && !auth.isAdmin">
          ⏳ En attente de la remise des fonds à l'emprunteur par l'administrateur.
        </div>
        <div class="facam-card" *ngIf="event.payoutStatus !== 'done' && auth.isAdmin">
          <h3 class="h-title">💸 Remettre les fonds à l'emprunteur</h3>
          <p class="t-muted small">Remettez <strong>{{ currency.eurXaf(event.targetAmount) }}</strong> à {{ event.borrowerName }}, puis enregistrez le mode.</p>
          <div class="payout-coords" *ngIf="event.responsiblePayout">
            <span *ngIf="event.responsiblePayout.preferredChannel" class="pref">📌 Canal préféré : <strong>{{ event.responsiblePayout.preferredChannel === 'paypal' ? 'PayPal' : 'Mobile Money' }}</strong></span>
            <span *ngIf="event.responsiblePayout.paypalEmail">📧 PayPal : <strong>{{ event.responsiblePayout.paypalEmail }}</strong></span>
            <span *ngIf="event.responsiblePayout.mobileMoneyNumber">📱 {{ operatorLabel(event.responsiblePayout.mobileMoneyOperator) }} : <strong>{{ event.responsiblePayout.mobileMoneyNumber }}</strong></span>
          </div>
          <label class="fld-label req">Mode de versement</label>
          <ion-select class="fld" interface="alert" [(ngModel)]="payoutMethod" placeholder="Choisir">
            <ion-select-option value="transfer">Virement bancaire</ion-select-option>
            <ion-select-option value="cash">Espèces</ion-select-option>
            <ion-select-option value="cheque">Chèque</ion-select-option>
            <ion-select-option value="paypal">PayPal</ion-select-option>
            <ion-select-option value="mobile_money">Mobile Money</ion-select-option>
            <ion-select-option value="other">Autre</ion-select-option>
          </ion-select>
          <label class="fld-label">Note (optionnel)</label>
          <ion-input class="fld" [(ngModel)]="payoutNote" placeholder="Réf., date…"></ion-input>
          <ion-button expand="block" class="ion-margin-top" color="success" [disabled]="!payoutMethod" (click)="settle()">
            Marquer comme versé
          </ion-button>
        </div>

        <!-- Disbursement done → repayment form for borrower -->
        <div class="facam-card" *ngIf="event.payoutStatus === 'done' && isBorrower()">
          <h3 class="h-title">↩️ Enregistrer un remboursement</h3>
          <p class="t-muted small">Vous devez encore <strong>{{ currency.eurXaf(remainingLoan()) }}</strong>.</p>
          <label class="fld-label req">Montant (€)</label>
          <ion-input class="fld" type="number" inputmode="decimal" [(ngModel)]="repayAmount" placeholder="0"></ion-input>
          <label class="fld-label">Mode (optionnel)</label>
          <ion-select class="fld" interface="alert" [(ngModel)]="repayMethod" placeholder="Choisir">
            <ion-select-option value="transfer">Virement bancaire</ion-select-option>
            <ion-select-option value="cash">Espèces</ion-select-option>
            <ion-select-option value="cheque">Chèque</ion-select-option>
            <ion-select-option value="paypal">PayPal</ion-select-option>
            <ion-select-option value="mobile_money">Mobile Money</ion-select-option>
            <ion-select-option value="other">Autre</ion-select-option>
          </ion-select>
          <label class="fld-label">Note</label>
          <ion-input class="fld" [(ngModel)]="repayNote" placeholder="Réf., date…"></ion-input>
          <ion-button expand="block" class="ion-margin-top" color="success" [disabled]="!canRepay()" (click)="repay()">
            Enregistrer le remboursement
          </ion-button>
        </div>

        <div class="facam-card" *ngIf="event.payoutStatus === 'done' && auth.isAdmin">
          <ion-button expand="block" fill="outline" color="warning" (click)="closeNow()">🏁 Clôturer le prêt maintenant</ion-button>
          <p class="t-muted small" style="margin-top:8px">Force la clôture (par exemple si le solde restant est définitivement perdu — l'emprunteur sera bloqué tant qu'il n'est pas débloqué.)</p>
        </div>
      </ng-container>

      <!-- CLOSED -->
      <ng-container *ngIf="event.status === 'closed'">
        <div class="facam-card">
          <div class="row"><span>💶 Total collecté</span><strong>{{ currency.eurXaf(event.totalCollected) }}</strong></div>
          <div class="row"><span>👤 À remettre à</span><strong>{{ event.responsibleName }}</strong></div>
          <div class="row"><span>📅 Clôturé le</span><strong>{{ event.closedAt | date: 'dd/MM/yyyy' }}</strong></div>
        </div>

        <!-- Versement enregistré -->
        <div class="facam-card paid" *ngIf="event.payoutStatus === 'done'">
          <h3 class="h-title">✅ Versement effectué</h3>
          <div class="row"><span>Mode</span><strong>{{ methodLabel(event.payoutMethod) }}</strong></div>
          <div class="row" *ngIf="event.payoutNote"><span>Note</span><strong>{{ event.payoutNote }}</strong></div>
          <div class="row"><span>Enregistré le</span><strong>{{ event.payoutAt | date: 'dd/MM/yyyy' }}</strong></div>
        </div>

        <!-- Versement en attente -->
        <ng-container *ngIf="event.payoutStatus !== 'done'">
          <div class="facam-card pending" *ngIf="!auth.isAdmin">
            ⏳ <strong>{{ currency.eurXaf(event.totalCollected) }}</strong> à remettre à {{ event.responsibleName }}.
            En attente de l'enregistrement du versement par l'administrateur.
          </div>

          <!-- Réouverture / prolongation : tant que les fonds ne sont pas versés -->
          <div class="facam-card" *ngIf="canExtend()">
            <h3 class="h-title">↩️ Prolonger l'évènement</h3>
            <p class="t-muted small">
              Repousse la date limite (et éventuellement la date de l'évènement) et rouvre l'évènement
              en collecte si nécessaire. À utiliser uniquement tant que les fonds n'ont pas encore été versés.
            </p>
            <label class="fld-label req">Nouvelle date limite (collecte)</label>
            <ion-input class="fld" type="date" [(ngModel)]="extendDeadline"></ion-input>
            <label class="fld-label">Nouvelle date de l'évènement <span class="t-muted">(facultatif)</span></label>
            <ion-input class="fld" type="date" [(ngModel)]="extendEventDate"></ion-input>
            <ion-button expand="block" class="ion-margin-top" color="primary" [disabled]="!extendDeadline" (click)="extend()">
              Prolonger & rouvrir
            </ion-button>
          </div>

          <div class="facam-card" *ngIf="auth.isAdmin">
            <h3 class="h-title">💸 Enregistrer le versement</h3>
            <p class="t-muted small">Remettez <strong>{{ currency.eurXaf(event.totalCollected) }}</strong> à {{ event.responsibleName }} par le canal de votre choix, puis enregistrez-le ici.</p>
            <div class="payout-coords" *ngIf="event.responsiblePayout">
              <span *ngIf="event.responsiblePayout.preferredChannel" class="pref">📌 Canal préféré : <strong>{{ event.responsiblePayout.preferredChannel === 'paypal' ? 'PayPal' : 'Mobile Money' }}</strong></span>
              <span *ngIf="event.responsiblePayout.paypalEmail">📧 PayPal : <strong>{{ event.responsiblePayout.paypalEmail }}</strong></span>
              <span *ngIf="event.responsiblePayout.mobileMoneyNumber">📱 {{ operatorLabel(event.responsiblePayout.mobileMoneyOperator) }} : <strong>{{ event.responsiblePayout.mobileMoneyNumber }}</strong></span>
            </div>
            <label class="fld-label req">Mode de versement</label>
            <ion-select class="fld" interface="alert" [(ngModel)]="payoutMethod" placeholder="Choisir">
              <ion-select-option value="transfer">Virement bancaire</ion-select-option>
              <ion-select-option value="cash">Espèces</ion-select-option>
              <ion-select-option value="cheque">Chèque</ion-select-option>
              <ion-select-option value="paypal">PayPal</ion-select-option>
              <ion-select-option value="mobile_money">Mobile Money</ion-select-option>
              <ion-select-option value="other">Autre</ion-select-option>
            </ion-select>
            <label class="fld-label">Note (optionnel)</label>
            <ion-input class="fld" [(ngModel)]="payoutNote" placeholder="Réf. virement, date, précisions…"></ion-input>
            <ion-button expand="block" class="ion-margin-top" color="success" [disabled]="!payoutMethod" (click)="settle()">
              Marquer comme versé
            </ion-button>
          </div>
        </ng-container>
      </ng-container>
    </ion-content>
  `,
  styles: [
    `
      .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .facam-card { margin-bottom: 14px; }
      .row { display: flex; justify-content: space-between; padding: 7px 0; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,.06); }
      .row:last-child { border-bottom: none; }
      .row strong { color: #fff; }
      h3.h-title { font-size: 1.1rem; margin: 0 0 6px; }
      .bar-label { color: #94a3b8; font-size: .75rem; margin: 10px 0 4px; }
      .wa { margin: 0 0 14px; }
      .small { font-size: .82rem; }
      .tally { display: flex; justify-content: space-around; margin: 12px 0; font-weight: 700; }
      .t-yes { color: #34d399; } .t-no { color: #f87171; }
      .rule-line { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; color: #cbd5e1; font-size: .88rem; padding: 5px 0; line-height: 1.5; }
      .rule-line strong { color: #fff; }
      .rule-line em { font-style: normal; color: #94a3b8; }
      .payout-coords { display: flex; flex-direction: column; gap: 6px; background: rgba(56,189,248,.08); border: 1px solid rgba(56,189,248,.25); border-radius: 10px; padding: 10px 12px; margin: 8px 0 14px; font-size: .85rem; color: #cbd5e1; }
      .payout-coords strong { color: #fff; }
      .payout-coords .pref { color: #38bdf8; font-weight: 600; }
      .rule-line .check { font-size: 1.05rem; flex-shrink: 0; }
      .rule-line.state { justify-content: center; margin-top: 6px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,.12); font-weight: 700; color: #fff; }
      .vote-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .admin-box { margin-top: 14px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,.15); }
      .paid { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.3); }
      .pending { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.35); color: #fde68a; line-height: 1.5; }
      .pending strong { color: #fff; }
      .loan-banner { background: rgba(16,185,129,.10); border-color: rgba(16,185,129,.30); color: #6ee7b7; line-height: 1.5; }
      .loan-banner strong { color: #fff; }
      .borrower-note { background: rgba(59,130,246,.10); border: 1px solid rgba(59,130,246,.3); color: #93c5fd; border-radius: 10px; padding: 10px; margin: 10px 0 6px; font-size: .88rem; }
      .borrower-note strong { color: #fff; }
      .t-accent { color: var(--facam-accent); font-weight: 700; }
    `,
  ],
})
export class EventDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly currency = inject(CurrencyService);
  private readonly whatsapp = inject(WhatsappService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  /** Info famille pour repérer si je suis le chef (autorisé à prolonger). */
  familyInfo: FamilyInfo | null = null;

  event: FamilyEvent | null = null;
  balance: MyBalance | null = null;
  amount = 0;
  myVote: VoteValue | null = null;
  payoutMethod = '';
  payoutNote = '';
  repayAmount = 0;
  repayMethod = '';
  repayNote = '';
  extAmount = 0;
  extMethod = '';
  extNote = '';
  /** Prolongation : nouvelle date limite (collecte) + nouvelle date évènement. */
  extendDeadline = '';
  extendEventDate = '';

  ngOnInit() {
    this.refreshAll();
  }

  ionViewWillEnter() {
    this.refreshAll();
  }

  private refreshAll() {
    this.reload();
    this.api.myBalance().subscribe((b) => (this.balance = b));
    this.api.familyInfo().subscribe((i) => (this.familyInfo = i));
  }

  /** Admin OU chef de famille peuvent prolonger tant que les fonds ne sont pas versés. */
  canExtend(): boolean {
    if (!this.event) return false;
    if (this.event.payoutStatus === 'done') return false;
    if (this.event.status !== 'closed' && this.event.status !== 'active') return false;
    const meId = this.auth.snapshot?.member?.id;
    return this.auth.isAdmin || (!!meId && meId === this.familyInfo?.chief?.id);
  }

  async extend() {
    if (!this.event || !this.extendDeadline) return;
    const loading = await this.loadingCtrl.create({ message: 'Prolongation…' });
    await loading.present();
    this.api.extendEvent(this.event.id, this.extendDeadline, this.extendEventDate || null).subscribe({
      next: async () => {
        await loading.dismiss();
        const t = await this.toastCtrl.create({
          message: 'Évènement prolongé et rouvert',
          color: 'success',
          duration: 2200,
        });
        await t.present();
        this.extendDeadline = '';
        this.extendEventDate = '';
        this.refreshAll();
      },
      error: async (err: unknown) => {
        await loading.dismiss();
        const raw = (err as { error?: { message?: string | string[] } })?.error?.message;
        const msg = Array.isArray(raw) ? raw.join(' ') : raw || 'Prolongation impossible.';
        const t = await this.toastCtrl.create({ message: String(msg), color: 'danger', duration: 3500 });
        await t.present();
      },
    });
  }

  private reload() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.event(id).subscribe((e) => {
      this.event = e;
      this.myVote = e.myVote ?? null;
    });
  }

  ratio() {
    if (!this.event || !this.event.targetAmount) return 0;
    const t = Number(this.event.targetAmount);
    return t > 0 ? Math.min(100, (Number(this.event.totalCollected) / t) * 100) : 0;
  }

  canContributeExt(): boolean {
    return this.extAmount > 0;
  }

  async contributeExt() {
    if (!this.event || !this.canContributeExt()) return;
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
    await loading.present();
    this.api
      .contributeExternal(this.event.id, this.extAmount, this.extMethod || undefined, this.extNote || undefined)
      .subscribe({
        next: async () => {
          await loading.dismiss();
          const t = await this.toastCtrl.create({ message: 'Contribution enregistrée', color: 'success', duration: 1800 });
          await t.present();
          this.extAmount = 0;
          this.extMethod = '';
          this.extNote = '';
          this.reload();
        },
        error: () => loading.dismiss(),
      });
  }

  timeRatio(): number {
    if (!this.event) return 0;
    const start = this.event.createdAt ? new Date(this.event.createdAt).getTime() : Date.now();
    const end = new Date(this.event.deadline).getTime();
    if (end <= start) return 100;
    return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
  }

  daysLeft(): number {
    if (!this.event) return 0;
    return Math.max(0, Math.ceil((new Date(this.event.deadline).getTime() - Date.now()) / 86_400_000));
  }

  emojiFor(t: FamilyEvent['type']) {
    return { wedding: '💍', death: '🕯️', project: '🏗️', birthday: '🎂', other: '📌', loan: '💰', external: '🎁' }[t];
  }

  participantLabelFull(): string {
    if (!this.event) return 'Participants';
    if (this.event.type === 'external') return this.event.participantsCount === 1 ? 'Cotisant externe' : 'Cotisants externes';
    if (this.event.type === 'loan') return 'Remboursements effectués';
    return this.event.participantsCount === 1 ? 'Allouant' : 'Allouants';
  }

  isBorrower(): boolean {
    return !!this.event && this.event.type === 'loan' && this.event.borrowerId === this.auth.snapshot?.member?.id;
  }

  remainingLoan(): number {
    if (!this.event) return 0;
    return Math.max(0, Number(this.event.targetAmount) - Number(this.event.totalCollected));
  }

  canRepay(): boolean {
    return this.repayAmount > 0 && this.repayAmount <= this.remainingLoan() + 0.005;
  }

  async repay() {
    if (!this.event || !this.canRepay()) return;
    const confirm = await this.alertCtrl.create({
      header: 'Confirmer le remboursement',
      message: `Enregistrer un remboursement de ${this.repayAmount} € ?`,
      buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Confirmer', role: 'confirm' }],
    });
    await confirm.present();
    const { role } = await confirm.onDidDismiss();
    if (role !== 'confirm') return;
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
    await loading.present();
    this.api
      .recordRepayment(this.event.id, this.repayAmount, this.repayMethod || undefined, this.repayNote || undefined)
      .subscribe({
        next: async () => {
          await loading.dismiss();
          const t = await this.toastCtrl.create({ message: 'Remboursement enregistré', color: 'success', duration: 2000 });
          await t.present();
          this.repayAmount = 0;
          this.repayMethod = '';
          this.repayNote = '';
          this.reload();
        },
        error: () => loading.dismiss(),
      });
  }
  statusLabel() {
    const s = this.event!.status;
    return { proposed: 'À voter', active: 'Actif', closed: 'Clôturé', cancelled: 'Annulé', rejected: 'Rejeté' }[s];
  }
  badgeClass() {
    const s = this.event!.status;
    return { proposed: 'badge-proposed', active: 'badge-active', closed: 'badge-closed', cancelled: 'badge-closed', rejected: 'badge-rejected' }[s];
  }

  announce() {
    if (!this.event) return;
    const e = this.event;
    const action = e.status === 'proposed' ? 'À voter avant le ' + this.fmt(e.decisionDeadline) : 'Objectif ' + e.targetAmount + ' €';
    const msg = `📣 ${e.title} (${this.auth.snapshot?.family.name}) — ${action}. Ouvrez l'app Family Cash Management pour participer.`;
    this.whatsapp.share(msg);
  }

  private fmt(d: string | null | undefined): string {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  }

  async castVote(value: VoteValue) {
    if (!this.event) return;
    this.api.vote(this.event.id, value).subscribe(async (res) => {
      this.myVote = res.myVote;
      const t = await this.toastCtrl.create({ message: `Vote enregistré : ${value === 'yes' ? 'POUR' : 'CONTRE'}`, color: 'success', duration: 1800 });
      await t.present();
      this.reload();
    });
  }

  async adminActivate() {
    if (!this.event) return;
    this.api.activateEvent(this.event.id).subscribe(async () => {
      const t = await this.toastCtrl.create({ message: 'Évènement activé', color: 'success', duration: 2000 });
      await t.present();
      this.reload();
    });
  }

  async adminReject() {
    if (!this.event) return;
    const confirm = await this.alertCtrl.create({
      header: 'Rejeter la proposition ?',
      buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Rejeter', role: 'confirm' }],
    });
    await confirm.present();
    const { role } = await confirm.onDidDismiss();
    if (role !== 'confirm') return;
    this.api.rejectEvent(this.event.id).subscribe(async () => {
      const t = await this.toastCtrl.create({ message: 'Proposition rejetée', color: 'medium', duration: 2000 });
      await t.present();
      this.router.navigateByUrl('/events');
    });
  }

  methodLabel(m?: string | null): string {
    const map: Record<string, string> = {
      transfer: 'Virement bancaire',
      cash: 'Espèces',
      cheque: 'Chèque',
      paypal: 'PayPal',
      mobile_money: 'Mobile Money',
      other: 'Autre',
    };
    return (m && map[m]) || '—';
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

  async closeNow() {
    if (!this.event) return;
    const confirm = await this.alertCtrl.create({
      header: 'Clôturer maintenant ?',
      message: 'Les cotisations seront arrêtées. Vous pourrez ensuite enregistrer le versement au responsable.',
      buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Clôturer', role: 'confirm' }],
    });
    await confirm.present();
    const { role } = await confirm.onDidDismiss();
    if (role !== 'confirm') return;
    this.api.closeEvent(this.event.id).subscribe(async () => {
      const t = await this.toastCtrl.create({ message: 'Évènement clôturé', color: 'success', duration: 2000 });
      await t.present();
      this.reload();
    });
  }

  async settle() {
    if (!this.event || !this.payoutMethod) return;
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
    await loading.present();
    this.api.settleEvent(this.event.id, this.payoutMethod, this.payoutNote || undefined).subscribe({
      next: async () => {
        await loading.dismiss();
        const t = await this.toastCtrl.create({ message: 'Versement enregistré', color: 'success', duration: 2000 });
        await t.present();
        this.payoutMethod = '';
        this.payoutNote = '';
        this.reload();
      },
      error: () => loading.dismiss(),
    });
  }

  canAllocate(): boolean {
    return !!this.balance && this.amount > 0 && Number(this.balance.balance) >= this.amount;
  }

  async allocate() {
    if (!this.event) return;
    const confirm = await this.alertCtrl.create({
      header: "Confirmer l'allocation",
      message: `Allouer ${this.amount} € à "${this.event.title}" ? Opération définitive.`,
      buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Confirmer', role: 'confirm' }],
    });
    await confirm.present();
    const { role } = await confirm.onDidDismiss();
    if (role !== 'confirm') return;

    const loading = await this.loadingCtrl.create({ message: 'Allocation…' });
    await loading.present();
    this.api.allocate({ eventId: this.event.id, amount: this.amount }).subscribe({
      next: async () => {
        await loading.dismiss();
        const t = await this.toastCtrl.create({ message: 'Allocation enregistrée', color: 'success', duration: 2200 });
        await t.present();
        this.amount = 0;
        this.reload();
        this.api.myBalance().subscribe((b) => (this.balance = b));
      },
      error: () => loading.dismiss(),
    });
  }
}
