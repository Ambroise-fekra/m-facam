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
  selector: 'app-help',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/dashboard" /></ion-buttons>
        <ion-title>Aide & guide</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <h1 class="g-h1">Guide d'utilisation</h1>
      <p class="t-muted intro">Family Cash Management — gérez ensemble la caisse de votre famille : cotisations, évènements et solidarité, en toute confidentialité.</p>

      <h2 class="g-h2">👑 La famille & l'administrateur</h2>
      <ul>
        <li>Une famille est <strong>créée une seule fois</strong> par un <strong>administrateur</strong> (essai gratuit 30 jours).</li>
        <li>À la création, un <strong>identifiant de famille</strong> unique (ex. <em>FAM-DUPONT-0001</em>) est généré : il sert à <strong>tous les membres</strong> pour se connecter (avec leur email + mot de passe). Notez-le précieusement.</li>
        <li>L'admin paramètre l'<strong>email PayPal</strong> de la famille et le <strong>lien du groupe WhatsApp</strong>.</li>
      </ul>

      <h2 class="g-h2">👨‍👩‍👧 Les membres</h2>
      <ul>
        <li>Les membres sont <strong>créés par l'admin</strong> (nom, email, téléphone, filiation père/mère).</li>
        <li>L'admin les <strong>invite par WhatsApp ou email</strong> via un lien : chaque membre choisit alors <strong>son propre mot de passe</strong> et rejoint la famille.</li>
        <li>Chacun peut ajouter sa <strong>photo</strong> ; l'admin peut aussi gérer les photos.</li>
      </ul>

      <h2 class="g-h2">💳 Cotiser (alimenter la caisse)</h2>
      <ul>
        <li>Chaque membre verse de l'argent dans la <strong>caisse familiale</strong> via PayPal.</li>
        <li>Le versement augmente <strong>votre part</strong> dans la caisse. Les cotisations sont <strong>anonymes</strong> : les autres voient la caisse monter, pas qui a versé.</li>
      </ul>

      <h2 class="g-h2">🗳️ Proposer & voter un évènement</h2>
      <ul>
        <li>Tout membre peut <strong>proposer un évènement</strong> (mariage, décès, projet…) avec un montant objectif, une date et une échéance.</li>
        <li>La proposition est <strong>soumise au vote</strong> de la famille : vote <strong>anonyme</strong> (pour/contre), modifiable jusqu'à l'échéance.</li>
        <li>L'évènement devient <strong>actif</strong> s'il obtient <strong>2/3 de OUI</strong> avec un <strong>quorum de 2/3</strong> des membres. L'<strong>admin</strong> peut aussi l'<strong>activer ou rejeter</strong> directement (cas urgent).</li>
      </ul>

      <h2 class="g-h2">🙋 Participer financièrement</h2>
      <ul>
        <li>Sur un évènement actif, vous <strong>allouez</strong> le montant de votre choix <strong>depuis votre part</strong> de la caisse.</li>
        <li>L'allocation <strong>diminue votre solde</strong> et alimente la cagnotte de l'évènement.</li>
        <li>À l'<strong>échéance</strong>, l'évènement est clôturé et le total est <strong>versé au responsable</strong> désigné (PayPal).</li>
      </ul>

      <h2 class="g-h2">📊 Soldes, transactions & suivi</h2>
      <ul>
        <li><strong>Tableau de bord</strong> : la <strong>caisse familiale</strong> (total) et <strong>votre part</strong>.</li>
        <li><strong>Mes transactions</strong> : vos <strong>crédits</strong> (cotisations) et <strong>débits</strong> (allocations) + votre solde.</li>
        <li><strong>Évènements</strong> : barre de <strong>montant</strong> (collecté/objectif) et barre de <strong>temps</strong> (jours restants), votre part dans chaque cagnotte.</li>
      </ul>

      <h2 class="g-h2">🌳 Famille & arbre généalogique</h2>
      <ul>
        <li>La page <strong>Famille</strong> liste tous les membres (parents/enfants, photos), avec le bouton <strong>WhatsApp du groupe</strong>.</li>
        <li>L'<strong>arbre généalogique</strong> se construit automatiquement à partir des liens père/mère.</li>
      </ul>

      <h2 class="g-h2">🔔 Notifications</h2>
      <ul>
        <li>À chaque <strong>cotisation</strong> (la caisse monte) et chaque <strong>allocation</strong> (une cagnotte monte).</li>
        <li>À la <strong>proposition d'un évènement</strong> (à voter) et à son <strong>activation</strong>.</li>
        <li>Rappels d'<strong>abonnement</strong> avant échéance.</li>
        <li><em>Anniversaires : notification automatique (et message WhatsApp) prévue dans une prochaine version.</em></li>
      </ul>

      <h2 class="g-h2">🔒 Confidentialité</h2>
      <p>Chaque membre voit <strong>sa propre part</strong> et <strong>sa propre participation</strong> à un évènement, <strong>jamais</strong> celles des autres. La caisse et les cagnottes n'affichent que des <strong>totaux</strong>.</p>

      <h2 class="g-h2">💶 Abonnement</h2>
      <ul>
        <li><strong>30 jours gratuits</strong>, puis <strong>20 €/an</strong> (PayPal).</li>
        <li>Sans paiement : la famille est <strong>désactivée 1 mois</strong> (données conservées, l'admin peut régulariser), puis <strong>supprimée</strong> si toujours impayée.</li>
        <li>Votre compte PayPal familial <strong>vous appartient</strong> : vous ne perdez pas votre argent.</li>
      </ul>

      <p class="t-muted foot">Family Cash Management — By ALICSIA (Ambroise Fouti LOEMBA)</p>
    </ion-content>
  `,
  styles: [
    `
      .g-h1 { color: #fff; font-size: 1.5rem; margin: 4px 0 6px; }
      .intro { margin-bottom: 8px; }
      .g-h2 { color: #fff; font-size: 1.12rem; margin: 20px 0 6px; }
      ul { padding-left: 18px; margin: 0; }
      li { color: #cbd5e1; line-height: 1.6; margin: 5px 0; }
      p { color: #cbd5e1; line-height: 1.6; }
      strong { color: #fff; }
      .foot { margin-top: 26px; font-size: .85rem; color: #94a3b8; text-align: center; }
    `,
  ],
})
export class HelpPage {}
