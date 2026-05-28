import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { ApiService } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { Member, MyBalance } from '../../core/models/api.models';

@Component({
  selector: 'app-contribute',
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
        <ion-buttons slot="start"><ion-back-button defaultHref="/dashboard" /></ion-buttons>
        <ion-title>Cotiser</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <div class="balance" *ngIf="balance">
        <span>Ma part actuelle</span>
        <strong>{{ currency.eurXaf(balance.balance) }}</strong>
      </div>

      <ng-container *ngIf="!paymentStarted">
        <label class="fld-label">Montant à verser (€)</label>
        <ion-input class="fld amount" type="number" inputmode="decimal" [(ngModel)]="amount" placeholder="100"></ion-input>
        <p class="t-muted small" *ngIf="amount > 0">
          ≈ <strong>{{ currency.xaf(amount) }}</strong>
        </p>

        <p class="preview" *ngIf="balance && amount > 0">
          Après versement : <strong>{{ currency.eurXaf((+balance.balance + amount).toFixed(2)) }}</strong>
        </p>

        <label class="fld-label">Canal de paiement</label>
        <ion-select class="fld" interface="alert" [(ngModel)]="channel" placeholder="Choisir le canal">
          <ion-select-option value="paypal">💳 PayPal</ion-select-option>
          <ion-select-option value="mobile_money">📱 Mobile Money</ion-select-option>
        </ion-select>
        <p class="t-muted small" *ngIf="me?.preferredChannel">
          ℹ️ Votre canal préféré dans votre profil : <strong>{{ me?.preferredChannel === 'paypal' ? 'PayPal' : 'Mobile Money' }}</strong>
        </p>

        <div class="paypal" *ngIf="channel === 'paypal'">
          <span class="pp">💳 PayPal (simulation)</span>
          <span class="note">Paiement anonyme — la famille est notifiée que la caisse augmente.</span>
        </div>
        <div class="mm" *ngIf="channel === 'mobile_money'">
          <span class="pp">📱 Mobile Money</span>
          <span class="note">
            Phase 1 : le canal est enregistré, le paiement passe encore par la simulation PayPal en attendant l'intégration CinetPay.
          </span>
        </div>

        <ion-button expand="block" (click)="pay()" [disabled]="!amount || amount < 1 || !channel">
          🔒 Procéder au versement
        </ion-button>
      </ng-container>

      <!-- Après ouverture de la page de paiement -->
      <ng-container *ngIf="paymentStarted">
        <div class="facam-card returned">
          <div class="emoji">↩️</div>
          <h3 class="h-title">De retour du paiement ?</h3>
          <p class="t-muted">Une fois « Payer » validé dans l'onglet de paiement, revenez ici et actualisez votre solde.</p>
          <ion-button expand="block" (click)="refresh()">Actualiser mon solde</ion-button>
          <ion-button expand="block" fill="outline" color="medium" (click)="router.navigateByUrl('/dashboard')">
            Retour au tableau de bord
          </ion-button>
          <ion-button expand="block" fill="clear" (click)="paymentStarted = false">Faire un autre versement</ion-button>
        </div>
      </ng-container>
    </ion-content>
  `,
  styles: [
    `
      .balance { background: var(--facam-gradient-soft); border: 1px solid rgba(99,102,241,.3); border-radius: 16px; padding: 16px; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 12px; }
      .balance strong { color: #fff; font-size: 1.05rem; text-align: right; }
      .amount { font-size: 1.4rem; }
      .preview { color: #cbd5e1; margin: 6px 0; }
      .preview strong { color: #34d399; }
      .small { font-size: .82rem; margin: 4px 0 8px; }
      .paypal { background: linear-gradient(135deg, #0070BA, #1546A0); border-radius: 14px; padding: 14px; margin: 14px 0; display: flex; flex-direction: column; }
      .paypal .pp { color: #fff; font-weight: 700; }
      .paypal .note { color: rgba(255,255,255,.85); font-size: .82rem; margin-top: 4px; }
      .mm { background: linear-gradient(135deg, #fbbf24, #d97706); border-radius: 14px; padding: 14px; margin: 14px 0; display: flex; flex-direction: column; }
      .mm .pp { color: #fff; font-weight: 700; }
      .mm .note { color: rgba(255,255,255,.92); font-size: .82rem; margin-top: 4px; }
      .returned { text-align: center; }
      .returned .emoji { font-size: 2.4rem; }
      .returned ion-button { margin-top: 8px; }
    `,
  ],
})
export class ContributePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);
  readonly currency = inject(CurrencyService);
  readonly router = inject(Router);

  balance: MyBalance | null = null;
  me: Member | null = null;
  amount = 0;
  channel: 'paypal' | 'mobile_money' | '' = '';
  paymentStarted = false;

  ngOnInit() {
    this.refresh();
    this.api.me().subscribe((m) => {
      this.me = m;
      // Pré-sélectionne le canal préféré du membre si défini.
      if (m.preferredChannel) this.channel = m.preferredChannel;
    });
  }

  ionViewWillEnter() {
    this.refresh();
  }

  refresh() {
    this.api.myBalance().subscribe(async (b) => {
      this.balance = b;
      if (this.paymentStarted) {
        const t = await this.toastCtrl.create({ message: 'Solde actualisé', color: 'success', duration: 1500 });
        await t.present();
      }
    });
  }

  async pay() {
    if (!this.channel) return;
    const loading = await this.loadingCtrl.create({ message: 'Préparation du paiement…' });
    await loading.present();
    this.api
      .startContribution({ amount: this.amount, channel: this.channel })
      .subscribe({
        next: async (res) => {
          await loading.dismiss();
          this.paymentStarted = true;
          if (Capacitor.isNativePlatform()) {
            await Browser.open({ url: res.approveUrl });
          } else {
            const w = window.open(res.approveUrl, '_blank', 'noopener,noreferrer');
            if (!w) window.location.href = res.approveUrl;
          }
        },
        error: async (err: unknown) => {
          await loading.dismiss();
          const raw = (err as { error?: { message?: string | string[] } })?.error?.message;
          const msg = Array.isArray(raw) ? raw.join(' ') : raw || 'Impossible de démarrer le paiement.';
          const t = await this.toastCtrl.create({ message: String(msg), color: 'danger', duration: 3500 });
          await t.present();
        },
      });
  }
}
