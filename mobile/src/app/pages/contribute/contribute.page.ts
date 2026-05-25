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
  IonTitle,
  IonToolbar,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { Browser } from '@capacitor/browser';
import { ApiService } from '../../core/services/api.service';
import { MyBalance } from '../../core/models/api.models';

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
        <strong>{{ balance.balance }} €</strong>
      </div>

      <ng-container *ngIf="!paymentStarted">
        <label class="fld-label">Montant à verser (€)</label>
        <ion-input class="fld amount" type="number" inputmode="decimal" [(ngModel)]="amount" placeholder="100"></ion-input>

        <p class="preview" *ngIf="balance && amount > 0">
          Après versement : <strong>{{ (+balance.balance + amount).toFixed(2) }} €</strong>
        </p>

        <div class="paypal">
          <span class="pp">💳 PayPal (simulation)</span>
          <span class="note">Paiement anonyme — la famille est notifiée que la caisse augmente.</span>
        </div>

        <ion-button expand="block" (click)="pay()" [disabled]="!amount || amount < 1">
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
      .balance { background: var(--facam-gradient-soft); border: 1px solid rgba(99,102,241,.3); border-radius: 16px; padding: 16px; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .balance strong { color: #fff; font-size: 1.5rem; }
      .amount { font-size: 1.4rem; }
      .preview { color: #cbd5e1; }
      .preview strong { color: #34d399; }
      .paypal { background: linear-gradient(135deg, #0070BA, #1546A0); border-radius: 14px; padding: 14px; margin: 14px 0; display: flex; flex-direction: column; }
      .paypal .pp { color: #fff; font-weight: 700; }
      .paypal .note { color: rgba(255,255,255,.85); font-size: .82rem; margin-top: 4px; }
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
  readonly router = inject(Router);

  balance: MyBalance | null = null;
  amount = 0;
  paymentStarted = false;

  ngOnInit() {
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
    const loading = await this.loadingCtrl.create({ message: 'Préparation du paiement…' });
    await loading.present();
    this.api.startContribution({ amount: this.amount }).subscribe({
      next: async (res) => {
        await loading.dismiss();
        this.paymentStarted = true;
        await Browser.open({ url: res.approveUrl });
      },
      error: () => loading.dismiss(),
    });
  }
}
