import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  LoadingController,
} from '@ionic/angular/standalone';
import { Browser } from '@capacitor/browser';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionStatus } from '../../core/models/api.models';

@Component({
  selector: 'app-subscription',
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
        <ion-title>Abonnement</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding" *ngIf="status">
      <!-- TRIAL -->
      <div class="card t" *ngIf="status.state === 'trial'">
        <h2 class="h-title">🎁 Essai gratuit en cours</h2>
        <p>Fin de l'essai : <strong>{{ status.trialEndsAt | date: 'longDate' }}</strong> ({{ daysLeft(status.trialEndsAt) }} j restants).</p>
        <p class="t-muted">Sans abonnement, la famille sera désactivée puis supprimée (voir ci-dessous).</p>
        <ion-button expand="block" *ngIf="auth.isAdmin" (click)="upgrade()">Activer l'abonnement (10 €/an)</ion-button>
        <p class="t-muted small" *ngIf="!auth.isAdmin">Seul l'administrateur de la famille peut activer l'abonnement.</p>
      </div>

      <!-- ACTIVE -->
      <div class="card a" *ngIf="status.state === 'active'">
        <h2 class="h-title">✅ Abonnement actif</h2>
        <p>Renouvellement : <strong>{{ status.activeUntil | date: 'longDate' }}</strong></p>
        <p class="t-muted">Tarif : {{ status.priceEur }} €/an.</p>
      </div>

      <!-- EXPIRED / GRACE -->
      <div class="card e" *ngIf="status.state === 'past_due'">
        <h2 class="h-title">⚠️ Famille désactivée</h2>
        <p>Suppression définitive le <strong>{{ status.graceEndsAt | date: 'longDate' }}</strong>
          (dans {{ daysLeft(status.graceEndsAt) }} j) si l'abonnement n'est pas réglé.</p>
        <ion-button expand="block" color="warning" *ngIf="auth.isAdmin" (click)="upgrade()">Réactiver maintenant (10 €/an)</ion-button>
        <p class="t-muted small" *ngIf="!auth.isAdmin">Contactez l'administrateur de la famille pour réactiver l'abonnement.</p>
      </div>

      <!-- How it works -->
      <div class="facam-card how">
        <h3 class="h-title">Comment ça marche</h3>
        <ol>
          <li><strong>Essai</strong> : 30 jours gratuits.</li>
          <li><strong>Paiement</strong> : 10 €/an via PayPal (compte dédié de la solution).</li>
          <li><strong>Sans paiement</strong> : la famille est <strong>désactivée 1 mois</strong> (données conservées, connexion admin possible pour régulariser).</li>
          <li><strong>Toujours impayée après 1 mois</strong> : les données de la famille sont <strong>supprimées définitivement</strong>.</li>
        </ol>
      </div>

      <div class="facam-card reassure">
        💶 <strong>Vous ne perdez pas votre argent.</strong> La caisse repose sur <em>votre</em> compte PayPal familial,
        qui vous appartient. L'abonnement ne concerne que l'usage de l'application — vous gardez l'accès à votre
        compte PayPal et pouvez continuer à le gérer directement.
      </div>

      <p class="t-muted small center">
        <a routerLink="/legal" class="facam-link">Conditions d'utilisation & confidentialité (RGPD)</a>
      </p>
    </ion-content>
  `,
  styles: [
    `
      .card { border-radius: 18px; padding: 18px; color: #fff; margin-bottom: 14px; }
      .card.t { background: var(--facam-gradient-soft); border: 1px solid rgba(99,102,241,.3); }
      .card.a { background: rgba(16,185,129,.14); border: 1px solid rgba(16,185,129,.3); }
      .card.e { background: rgba(245,158,11,.16); border: 1px solid rgba(245,158,11,.4); }
      .card h2 { margin: 0 0 10px; font-size: 1.3rem; }
      .card p { color: #e2e8f0; }
      .how ol { padding-left: 18px; line-height: 1.7; color: #cbd5e1; }
      .how h3, .reassure { color: #cbd5e1; }
      .reassure { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.3); line-height: 1.6; }
      .reassure strong { color: #fff; }
      .small { font-size: .82rem; }
      .center { text-align: center; margin-top: 16px; }
    `,
  ],
})
export class SubscriptionPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly loadingCtrl = inject(LoadingController);

  status: SubscriptionStatus | null = null;

  ngOnInit() {
    this.api.subscription().subscribe((s) => (this.status = s));
  }

  daysLeft(date: string | null): number {
    if (!date) return 0;
    return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));
  }

  async upgrade() {
    const loading = await this.loadingCtrl.create({ message: 'Préparation du paiement…' });
    await loading.present();
    this.api.upgradeSubscription().subscribe({
      next: async (res) => {
        await loading.dismiss();
        await Browser.open({ url: res.approveUrl });
      },
      error: () => loading.dismiss(),
    });
  }
}
