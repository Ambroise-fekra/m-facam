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
      <p class="t-muted intro">Family Cash Management — gérez ensemble la caisse de votre famille : cotisations, évènements et solidarité, <strong>en toute confidentialité et transparence</strong>. L'application combine les deux : chacun voit la caisse globale, les évènements et le décompte des votes, mais <strong>seules les informations financières personnelles</strong> (sa part, ses cotisations, ses allocations) sont privées.</p>

      <h2 class="g-h2">👑 La famille, l'administrateur & le chef de famille</h2>
      <ul>
        <li>Une famille est <strong>créée une seule fois</strong> par un <strong>administrateur</strong> (essai gratuit 30 jours).</li>
        <li>À la création, un <strong>identifiant de famille</strong> unique (ex. <em>FAM-DUPONT-0001</em>) est généré : il sert à <strong>tous les membres</strong> pour se connecter (avec leur email + mot de passe). Notez-le précieusement.</li>
        <li>L'admin paramètre l'<strong>email PayPal</strong> de la famille, le <strong>lien du groupe WhatsApp</strong>, et désigne un <strong>chef de famille</strong> parmi les membres actifs.</li>
        <li>Le <strong>chef de famille</strong> apparaît sur le tableau de bord avec son téléphone, à côté de l'admin. Il dispose des mêmes droits que l'admin pour <strong>activer la connexion</strong> d'un membre et <strong>marquer un décès</strong>.</li>
      </ul>

      <h2 class="g-h2">👨‍👩‍👧 Les membres</h2>
      <ul>
        <li>Les membres sont <strong>créés par l'admin</strong> (nom, email, téléphone, filiation père/mère). L'admin les <strong>invite par WhatsApp ou email</strong> via un lien : chaque membre choisit alors <strong>son propre mot de passe</strong>.</li>
        <li>Chaque membre connecté peut <strong>déclarer ses propres enfants</strong> depuis « Mon profil » → 👶 <em>Ma descendance</em> (prénom, nom, sexe obligatoires). Les enfants sont créés <strong>inactifs</strong> et seront <strong>activés par l'admin ou le chef de famille</strong> le moment venu (par exemple à leur majorité), en cliquant sur « <strong>Activer la connexion</strong> ».</li>
        <li>Un membre « inactif » apparaît dans l'arbre généalogique mais ne compte pas dans le quorum et ne peut pas se connecter ni participer.</li>
        <li>Un membre peut être marqué <strong>🕯️ décédé(e)</strong> (case à cocher + date) par l'admin ou le chef de famille — il est alors automatiquement <strong>désactivé</strong> (exclu du quorum, non sélectionnable comme responsable ou emprunteur) mais reste dans l'arbre généalogique.</li>
        <li>Chacun peut ajouter sa <strong>photo</strong> avec <strong>recadrage rond</strong> (glisser/zoomer) ; le bouton 📷 permet de recadrer une photo déjà enregistrée ou d'en choisir une nouvelle. L'admin peut aussi gérer les photos des autres.</li>
      </ul>

      <h2 class="g-h2">💳 Cotiser (alimenter la caisse)</h2>
      <ul>
        <li>Chaque membre verse de l'argent dans la <strong>caisse familiale</strong> via PayPal.</li>
        <li>Le versement augmente <strong>votre part</strong> dans la caisse. Les cotisations sont <strong>anonymes</strong> : les autres voient la caisse monter, pas qui a versé.</li>
      </ul>

      <h2 class="g-h2">🗳️ Proposer & voter un évènement</h2>
      <ul>
        <li>Tout membre peut <strong>proposer un évènement</strong> (mariage, décès, projet, anniversaire…) avec une date et une échéance.</li>
        <li>Le <strong>montant objectif est facultatif</strong> (laissez à 0 si vous ne fixez pas de montant). Une <strong>suggestion par membre</strong> peut aussi être indiquée (montant indicatif à cotiser par chacun).</li>
        <li>La proposition est <strong>soumise au vote</strong> de la famille : vote <strong>anonyme</strong> (pour/contre), modifiable jusqu'à l'échéance.</li>
        <li>L'évènement devient <strong>actif</strong> s'il obtient <strong>au moins 2/3 de OUI</strong> avec un <strong>quorum de 2/3</strong> des membres actifs. L'<strong>admin</strong> peut aussi l'<strong>activer ou rejeter</strong> directement (cas urgent).</li>
        <li>Sur la fiche, la règle de quorum et de majorité s'affiche clairement avec le nombre absolu requis (ex. <em>Quorum 4/7 — 2/3 sur 10 membres actifs</em>).</li>
      </ul>

      <h2 class="g-h2">🙋 Participer financièrement</h2>
      <ul>
        <li>Sur un évènement actif, vous <strong>allouez</strong> le montant de votre choix <strong>depuis votre part</strong> de la caisse.</li>
        <li>L'allocation <strong>diminue votre solde</strong> et alimente la cagnotte de l'évènement.</li>
        <li>À l'<strong>échéance</strong>, l'évènement est clôturé. L'<strong>administrateur remet le total au responsable</strong> par le canal choisi (virement, espèces, chèque ou PayPal) et <strong>enregistre le versement</strong> dans l'app.</li>
      </ul>

      <h2 class="g-h2">🎁 Évènement externe (hors solidarité commune)</h2>
      <ul>
        <li>Un membre peut proposer un évènement externe (cagnotte hors solidarité familiale).</li>
        <li>Le vote est standard. Une fois actif, chaque membre fait une <strong>cotisation ciblée</strong> sur l'évènement — l'argent <strong>ne sort pas de sa part</strong> dans la caisse et <strong>ne passe pas par la caisse globale</strong>.</li>
        <li>À la clôture, l'admin remet le total au responsable (même flux qu'un évènement classique).</li>
      </ul>

      <h2 class="g-h2">💰 Prêt à un membre (évènement particulier)</h2>
      <ul>
        <li>Un membre actif peut <strong>demander un prêt</strong> à la caisse familiale (évènement de type <em>Prêt</em>).</li>
        <li>Le <strong>vote</strong> a lieu comme pour tout évènement, mais l'<strong>emprunteur est exclu</strong> du vote et du quorum.</li>
        <li>Plafond : le prêt ne peut excéder <strong>1/5 de la caisse</strong>. La caisse ne peut avoir <strong>plus de 2 prêts</strong> simultanés.</li>
        <li>Après vote favorable, l'<strong>admin remet les fonds</strong> à l'emprunteur (virement, espèces, chèque, PayPal).</li>
        <li>L'<strong>emprunteur rembourse</strong> via des « remboursements » enregistrés depuis la fiche de l'évènement (les autres membres ne peuvent rien y allouer).</li>
        <li>L'<strong>échéance</strong> de l'évènement est la <strong>date de remboursement</strong>. Si non remboursé à temps, le compte de l'emprunteur est <strong>bloqué</strong> (plus de votes, d'évènements ni de prêts) jusqu'à <strong>déblocage par l'admin</strong>.</li>
      </ul>

      <h2 class="g-h2">📊 Soldes, transactions & suivi</h2>
      <ul>
        <li><strong>Tableau de bord</strong> : la <strong>caisse familiale disponible</strong> (gros chiffre doré). Si des prêts sont en cours, le <strong>reste à rembourser</strong> apparaît juste en dessous (déjà décaissé de la caisse, en attente du remboursement).</li>
        <li><strong>Votre part</strong> dans la caisse + total cotisé et total alloué.</li>
        <li><strong>Mes transactions</strong> : vos <strong>crédits</strong> (cotisations) et <strong>débits</strong> (allocations) + votre solde.</li>
        <li><strong>Évènements</strong> : barre de <strong>montant</strong> (collecté/objectif si fixé) et barre de <strong>temps</strong> (jours restants), votre part/contribution dans chaque évènement.</li>
        <li>Trois flux d'argent distincts : <strong>cotisations</strong> à la caisse (augmentent votre part), <strong>allocations</strong> à un évènement classique (depuis votre part), et <strong>contributions ciblées</strong> aux évènements externes ou remboursements de prêt (ne touchent pas votre part).</li>
      </ul>

      <h2 class="g-h2">🌳 Famille & arbre généalogique</h2>
      <ul>
        <li>La page <strong>Famille</strong> liste tous les membres (parents/enfants, photos), avec les boutons <strong>WhatsApp</strong> par personne et le bouton <strong>groupe WhatsApp</strong>.</li>
        <li>L'<strong>arbre généalogique</strong> s'affiche par <strong>couples</strong> (père ❤️ mère sur la même ligne) avec les enfants indentés en dessous. Bordure colorée par sexe (♂ bleu / ♀ rose / ⚪ autre) pour repérer instantanément les rôles.</li>
        <li>Une page <strong>🎂 Anniversaires</strong> affiche les anniversaires du mois en cours et du mois suivant (les défunts sont exclus par respect).</li>
      </ul>

      <h2 class="g-h2">🔔 Notifications</h2>
      <ul>
        <li>À chaque <strong>cotisation</strong> (la caisse monte) et chaque <strong>allocation</strong> (une cagnotte monte).</li>
        <li>À la <strong>proposition d'un évènement</strong> (à voter) et à son <strong>activation</strong>.</li>
        <li>À la <strong>clôture d'un évènement</strong> avec rappel de la remise des fonds au responsable.</li>
        <li>En cas de <strong>prêt impayé à l'échéance</strong> : la famille est avertie et le compte de l'emprunteur est automatiquement bloqué.</li>
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
