import { Component } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-legal',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/auth/login" /></ion-buttons>
        <ion-title>Conditions & confidentialité</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <h2 class="h-title">Conditions d'utilisation</h2>
      <p class="t-muted">
        Family Cash Management permet à une famille de gérer une caisse commune (cotisations, évènements,
        allocations). Chaque famille dispose d'une base de données isolée.
      </p>
      <ul class="t-muted">
        <li>L'essai gratuit dure <strong>30 jours</strong>.</li>
        <li>L'abonnement est de <strong>20 €/an</strong>, payable par PayPal.</li>
        <li>Sans paiement à la fin de l'essai (ou du renouvellement), la famille est <strong>désactivée pendant 1 mois</strong>, puis ses données sont <strong>définitivement supprimées</strong> si toujours impayée.</li>
        <li>L'administrateur de la famille est responsable de la gestion des membres et des versements.</li>
      </ul>

      <div class="facam-card reassure">
        💶 <strong>Vos fonds vous appartiennent.</strong> La caisse repose sur <em>votre</em> compte PayPal familial.
        L'application orchestre les versements et le suivi, mais ne détient pas votre argent. En cas d'arrêt de
        l'abonnement, vous conservez l'accès à votre compte PayPal et pouvez continuer à le gérer directement.
      </div>

      <h2 class="h-title">Protection des données (RGPD)</h2>
      <ul class="t-muted">
        <li><strong>Données collectées</strong> : identité des membres (nom, email, téléphone, date de naissance, filiation), montants de cotisations/allocations, emails PayPal.</li>
        <li><strong>Finalité</strong> : gestion de la caisse familiale et des évènements ; aucune revente à des tiers.</li>
        <li><strong>Confidentialité interne</strong> : chaque membre ne voit que sa propre part ; les montants individuels des autres ne sont jamais exposés.</li>
        <li><strong>Conservation</strong> : tant que la famille est active ; suppression complète après la période de grâce non payée.</li>
        <li><strong>Vos droits</strong> : accès, rectification, suppression et portabilité. Contact : <span class="t-white">privacy&#64;familycash.example</span>.</li>
        <li><strong>Suppression sur demande</strong> : l'administrateur peut demander la suppression intégrale des données de la famille à tout moment.</li>
      </ul>

      <p class="t-muted small">Version de démonstration — adaptez ces textes à votre cadre juridique réel avant mise en production.</p>
    </ion-content>
  `,
  styles: [
    `
      h2.h-title { font-size: 1.2rem; margin: 18px 0 8px; }
      ul { padding-left: 18px; line-height: 1.7; }
      li { margin: 6px 0; }
      .reassure { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.3); color: #cbd5e1; line-height: 1.6; margin: 12px 0; }
      .reassure strong { color: #fff; }
      .small { font-size: .8rem; margin-top: 16px; }
    `,
  ],
})
export class LegalPage {}
