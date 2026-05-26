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
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
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

      <!-- Dates -->
      <div class="facam-card dates">
        <div class="row"><span>🗓️ Créé le</span><strong>{{ event.createdAt | date: 'dd/MM/yyyy' }}</strong></div>
        <div class="row"><span>🎉 Date de l'évènement</span><strong>{{ event.eventDate ? (event.eventDate | date: 'dd/MM/yyyy') : '—' }}</strong></div>
        <div class="row"><span>💰 Clôture des cotisations</span><strong>{{ event.deadline | date: 'dd/MM/yyyy' }}</strong></div>
        <div class="row" *ngIf="event.status === 'proposed'"><span>🗳️ Fin du vote</span><strong>{{ event.decisionDeadline | date: 'dd/MM/yyyy' }}</strong></div>
        <div class="row"><span>👤 Responsable</span><strong>{{ event.responsibleName }}</strong></div>
      </div>

      <ion-button expand="block" fill="outline" class="wa" (click)="announce()">💬 Annoncer sur WhatsApp</ion-button>

      <!-- VOTING (proposed) -->
      <div class="facam-card" *ngIf="event.status === 'proposed'">
        <h3 class="h-title">🗳️ Vote de la famille</h3>
        <p class="t-muted small">Vote anonyme · modifiable jusqu'à l'échéance · activation à la majorité des 2/3 (quorum 2/3).</p>
        <div class="tally">
          <div class="t-yes">✅ {{ event.tally?.yes || 0 }} oui</div>
          <div class="t-no">❌ {{ event.tally?.no || 0 }} non</div>
          <div class="t-q">Quorum {{ event.tally?.voters || 0 }}/{{ event.tally?.quorumNeeded || 0 }}</div>
        </div>
        <div class="vote-btns">
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

      <!-- FUNDING (active) -->
      <ng-container *ngIf="event.status === 'active'">
        <div class="facam-card">
          <div class="row"><span>🎯 Objectif</span><strong>{{ event.targetAmount }} €</strong></div>
          <div class="row"><span>💶 Collecté</span><strong>{{ event.totalCollected }} €</strong></div>
          <div class="row"><span>🙋 Votre part (privée)</span><strong class="t-accent">{{ event.myAllocation }} €</strong></div>
          <div class="bar-label">💶 Montant collecté</div>
          <div class="facam-progress"><div class="facam-progress-fill" [style.width.%]="ratio()"></div></div>
          <div class="bar-label">⏳ Temps avant clôture — {{ daysLeft() }} j restants</div>
          <div class="facam-progress"><div class="facam-progress-fill time" [style.width.%]="timeRatio()"></div></div>
        </div>

        <div class="facam-card">
          <h3 class="h-title">Allouer depuis mon solde</h3>
          <p class="t-muted small" *ngIf="balance">Solde disponible : {{ balance.balance }} €</p>
          <label class="fld-label">Montant à allouer (€)</label>
          <ion-input class="fld" type="number" inputmode="decimal" [(ngModel)]="amount" placeholder="0"></ion-input>
          <ion-button expand="block" class="ion-margin-top" [disabled]="!canAllocate()" (click)="allocate()">
            Confirmer l'allocation
          </ion-button>
        </div>

        <div class="facam-card" *ngIf="auth.isAdmin">
          <p class="t-muted small">Administrateur : si les fonds sont prêts, vous pouvez clôturer maintenant (sinon clôture automatique à l'échéance).</p>
          <ion-button expand="block" fill="outline" color="warning" (click)="closeNow()">🏁 Clôturer maintenant</ion-button>
        </div>
      </ng-container>

      <!-- CLOSED -->
      <ng-container *ngIf="event.status === 'closed'">
        <div class="facam-card">
          <div class="row"><span>💶 Total collecté</span><strong>{{ event.totalCollected }} €</strong></div>
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
            ⏳ <strong>{{ event.totalCollected }} €</strong> à remettre à {{ event.responsibleName }}.
            En attente de l'enregistrement du versement par l'administrateur.
          </div>
          <div class="facam-card" *ngIf="auth.isAdmin">
            <h3 class="h-title">💸 Enregistrer le versement</h3>
            <p class="t-muted small">Remettez <strong>{{ event.totalCollected }} €</strong> à {{ event.responsibleName }} par le canal de votre choix, puis enregistrez-le ici.</p>
            <label class="fld-label req">Mode de versement</label>
            <ion-select class="fld" interface="alert" [(ngModel)]="payoutMethod" placeholder="Choisir">
              <ion-select-option value="transfer">Virement bancaire</ion-select-option>
              <ion-select-option value="cash">Espèces</ion-select-option>
              <ion-select-option value="cheque">Chèque</ion-select-option>
              <ion-select-option value="paypal">PayPal</ion-select-option>
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
      .t-yes { color: #34d399; } .t-no { color: #f87171; } .t-q { color: #cbd5e1; }
      .vote-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .admin-box { margin-top: 14px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,.15); }
      .paid { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.3); }
      .pending { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.35); color: #fde68a; line-height: 1.5; }
      .pending strong { color: #fff; }
    `,
  ],
})
export class EventDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly whatsapp = inject(WhatsappService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);

  event: FamilyEvent | null = null;
  balance: MyBalance | null = null;
  amount = 0;
  myVote: VoteValue | null = null;
  payoutMethod = '';
  payoutNote = '';

  ngOnInit() {
    this.reload();
    this.api.myBalance().subscribe((b) => (this.balance = b));
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
    if (!this.event) return 0;
    const t = Number(this.event.targetAmount);
    return t > 0 ? Math.min(100, (Number(this.event.totalCollected) / t) * 100) : 0;
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
    return { wedding: '💍', death: '🕯️', project: '🏗️', birthday: '🎂', other: '📌' }[t];
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
      other: 'Autre',
    };
    return (m && map[m]) || '—';
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
