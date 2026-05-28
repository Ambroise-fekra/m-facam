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
      <p class="t-muted intro">
        Family Cash Management — gérez ensemble la caisse de votre famille : cotisations, évènements et solidarité,
        <strong>en toute sécurité, fiabilité, confidentialité et transparence</strong>. Chacun voit la caisse globale,
        les évènements et le décompte des votes ; <strong>seules les informations financières personnelles</strong>
        (sa part, ses cotisations, ses allocations) restent privées.
      </p>

      <h2 class="g-h2">👑 La famille, l'administrateur & le chef de famille</h2>
      <ul>
        <li>Une famille est <strong>créée une seule fois</strong> par un <strong>administrateur</strong> (essai gratuit 30 jours).</li>
        <li>À la création, un <strong>identifiant de famille</strong> unique (ex. <em>FAM-DUPONT-0001</em>) est généré : il sert à <strong>tous les membres</strong> pour se connecter (avec leur email + mot de passe). Notez-le précieusement.</li>
        <li>L'admin paramètre les <strong>coordonnées de paiement</strong> de la famille (PayPal pour l'Europe <strong>et / ou</strong> Mobile Money pour le Congo), le <strong>lien du groupe WhatsApp</strong>, et désigne un <strong>chef de famille</strong> parmi les membres actifs.</li>
        <li>Le <strong>chef de famille</strong> apparaît sur le tableau de bord avec son téléphone, à côté de l'admin. Il dispose des mêmes droits que l'admin pour <strong>activer la connexion</strong> d'un membre, <strong>marquer un décès</strong> et <strong>prolonger un évènement</strong>.</li>
      </ul>

      <h2 class="g-h2">👨‍👩‍👧 Les membres</h2>
      <ul>
        <li>Les membres sont <strong>créés par l'admin</strong> (nom, <strong>surnom</strong> facultatif, email <strong>ou</strong> téléphone, filiation père/mère).</li>
        <li><strong>Invitation par WhatsApp ou email</strong> : un lien d'activation est généré ; le membre y définit son mot de passe (et son email s'il n'avait qu'un téléphone) puis se connecte.</li>
        <li>Chaque membre connecté peut <strong>déclarer ses propres enfants</strong> depuis « Mon profil » → 👶 <em>Ma descendance</em>, et son <strong>conjoint(e)</strong> 💍 (soit un membre déjà présent dans la famille, soit un nouveau membre — inactif jusqu'à activation par l'admin / chef).</li>
        <li>L'admin (ou le chef) peut aussi déclarer le <strong>conjoint d'un membre décédé</strong>, pour enrichir l'arbre généalogique avec les couples historiques.</li>
        <li>Un membre « inactif » apparaît dans l'arbre mais ne compte pas dans le quorum et ne peut pas se connecter ni participer.</li>
        <li>Un membre peut être marqué <strong>🕯️ décédé(e)</strong> (case à cocher + date) par l'admin ou le chef — il est alors automatiquement <strong>désactivé</strong> mais reste dans l'arbre.</li>
        <li>Chacun peut ajouter sa <strong>photo</strong> avec <strong>recadrage rond</strong> (glisser/zoomer).</li>
      </ul>

      <h2 class="g-h2">🌍 Membre dans plusieurs familles</h2>
      <p>
        Un même email peut être rattaché à <strong>plusieurs familles</strong> indépendantes (par ex. votre famille
        maternelle <em>et</em> votre famille paternelle). Sur la page « Identifiant oublié », tous les identifiants
        rattachés à votre email vous sont affichés : il vous suffit de choisir la bonne famille à la connexion.
      </p>

      <h2 class="g-h2">💳 Cotiser (alimenter la caisse)</h2>
      <ul>
        <li>Chaque membre verse de l'argent dans la <strong>caisse familiale</strong> en choisissant son <strong>canal</strong> : <strong>💳 PayPal</strong> (pour les membres en Europe) ou <strong>📱 Mobile Money</strong> (pour les membres au Congo). Les deux canaux <strong>cohabitent</strong> dans la même famille.</li>
        <li>Le membre saisit son montant dans la devise de son choix : <strong>€ Euro</strong> ou <strong>FCFA</strong>. La parité étant <strong>fixe</strong> (1 € = 655,957 FCFA), l'app affiche en temps réel l'équivalent dans l'autre devise.</li>
        <li>Le versement augmente <strong>votre part</strong> dans la caisse. Les cotisations sont <strong>anonymes</strong> : les autres voient la caisse monter, pas qui a versé.</li>
        <li><strong>Versement hors-app</strong> : si vous avez donné en espèces, par virement direct ou par chèque, demandez à l'admin de l'<strong>enregistrer manuellement</strong> sur votre fiche. Il pourra renseigner le mode et la date du versement.</li>
        <li>💡 PayPal accepte aussi le <strong>paiement par carte bancaire sans compte PayPal</strong> (« Payer par carte »), pratique pour les membres qui n'ont pas PayPal.</li>
      </ul>

      <h2 class="g-h2">🗳️ Proposer & voter un évènement</h2>
      <ul>
        <li>Tout membre peut <strong>proposer un évènement</strong> (mariage, décès, projet, anniversaire…) avec une date et une échéance.</li>
        <li>Le <strong>montant objectif est facultatif</strong>. Une <strong>suggestion par membre</strong> peut aussi être indiquée.</li>
        <li>La proposition est <strong>soumise au vote anonyme</strong> de la famille (pour/contre), modifiable jusqu'à l'échéance.</li>
        <li>L'évènement devient <strong>actif</strong> avec <strong>2/3 de OUI</strong> et un <strong>quorum de 2/3</strong> des membres actifs. L'<strong>admin</strong> peut aussi l'activer / le rejeter directement (cas urgent).</li>
        <li><strong>↩️ Prolongation</strong> : tant que les fonds ne sont pas versés, l'<strong>admin ou le chef</strong> peut <strong>rouvrir un évènement clôturé</strong> automatiquement à l'échéance en repoussant la date limite (et éventuellement la date de l'évènement).</li>
      </ul>

      <h2 class="g-h2">🙋 Participer financièrement</h2>
      <ul>
        <li>Sur un évènement actif, vous <strong>allouez</strong> le montant de votre choix <strong>depuis votre part</strong> de la caisse (en € ou en FCFA, conversion automatique).</li>
        <li>L'allocation <strong>diminue votre solde</strong> et alimente la cagnotte de l'évènement.</li>
        <li>À l'<strong>échéance</strong>, l'évènement est clôturé. L'<strong>administrateur remet le total au responsable</strong> par le canal choisi (virement, espèces, chèque, PayPal ou Mobile Money) et <strong>enregistre le versement</strong> dans l'app. Les <strong>coordonnées de paiement</strong> du responsable (PayPal / Mobile Money) lui sont rappelées à ce moment.</li>
      </ul>

      <h2 class="g-h2">🎁 Évènement externe (hors solidarité commune)</h2>
      <ul>
        <li>Un membre peut proposer un évènement externe (cagnotte hors solidarité familiale).</li>
        <li>Le vote est standard. Une fois actif, chaque membre fait une <strong>cotisation ciblée</strong> sur l'évènement (en € ou en FCFA) — l'argent <strong>ne sort pas de sa part</strong> dans la caisse et <strong>ne passe pas par la caisse globale</strong>.</li>
        <li>À la clôture, l'admin remet le total au responsable (même flux qu'un évènement classique).</li>
      </ul>

      <h2 class="g-h2">💰 Prêt à un membre (évènement particulier)</h2>
      <ul>
        <li>Un membre actif peut <strong>demander un prêt</strong> à la caisse familiale.</li>
        <li>Le <strong>vote</strong> a lieu comme pour tout évènement, mais l'<strong>emprunteur est exclu</strong> du vote et du quorum.</li>
        <li>Plafond : le prêt ne peut excéder <strong>1/5 de la caisse</strong>. <strong>Max 2 prêts</strong> simultanés.</li>
        <li>Après vote favorable, l'<strong>admin remet les fonds</strong> à l'emprunteur (virement, espèces, chèque, PayPal ou Mobile Money).</li>
        <li>L'<strong>emprunteur rembourse</strong> via des « remboursements » enregistrés depuis la fiche de l'évènement (montant en € ou en FCFA, mode au choix).</li>
        <li>Si non remboursé à l'échéance, le compte de l'emprunteur est <strong>bloqué</strong> jusqu'à déblocage par l'admin.</li>
      </ul>

      <h2 class="g-h2">📊 Soldes, transactions & suivi</h2>
      <ul>
        <li><strong>Tableau de bord</strong> : la <strong>caisse familiale disponible</strong> (gros chiffre), affichée en <strong>€ ET en FCFA</strong>. Si des prêts sont en cours, le reste à rembourser apparaît juste en dessous.</li>
        <li><strong>Votre part</strong> dans la caisse + total cotisé / alloué (double affichage).</li>
        <li><strong>Mes transactions</strong> : chaque ligne est affichée <strong>dans sa devise d'origine</strong> (« +10 000 FCFA (≈ 15,25 €) » si vous avez payé en Mobile Money). Pas de perte d'arrondi.</li>
        <li><strong>Évènements</strong> : barre de <strong>montant</strong> (collecté/objectif) et barre de <strong>temps</strong>, votre part/contribution dans chaque évènement.</li>
        <li>Trois flux d'argent distincts : <strong>cotisations</strong> à la caisse (augmentent votre part), <strong>allocations</strong> à un évènement classique (depuis votre part), et <strong>contributions ciblées</strong> aux évènements externes ou remboursements de prêt (ne touchent pas votre part).</li>
      </ul>

      <h2 class="g-h2">🛠️ Correction d'une transaction</h2>
      <p>
        En cas d'erreur de saisie (mauvais montant, mauvaise devise, doublon…), <strong>contactez votre administrateur</strong> :
        il dispose des outils nécessaires pour <strong>corriger ou supprimer</strong> n'importe quelle cotisation, allocation,
        contribution externe ou remboursement de prêt. Le solde de chacun est <strong>automatiquement recalculé</strong>
        après correction. Aucune écriture n'est jamais perdue silencieusement : chaque ligne reste tracée jusqu'à
        ce qu'un admin agisse explicitement.
      </p>

      <h2 class="g-h2">🌳 Famille & arbre généalogique</h2>
      <ul>
        <li>La page <strong>Famille</strong> liste tous les membres avec leur <strong>surnom</strong> entre guillemets le cas échéant, leur <strong>conjoint(e)</strong> et leurs parents, avec les boutons <strong>WhatsApp</strong> par personne et le bouton <strong>groupe WhatsApp</strong>.</li>
        <li>La <strong>fiche d'un membre</strong> ouvre une vue agrandie avec photo en grand format, badges (admin / chef / décédé / inactif), et toutes ses coordonnées.</li>
        <li>L'<strong>arbre généalogique</strong> s'affiche par <strong>couples</strong> (père ❤️ mère sur la même ligne) avec les enfants indentés en dessous. Bordure colorée par sexe pour repérer instantanément les rôles.</li>
        <li>Une page <strong>🎂 Anniversaires</strong> affiche les anniversaires du mois en cours et du mois suivant (les défunts sont exclus par respect).</li>
      </ul>

      <h2 class="g-h2">🔔 Notifications</h2>
      <ul>
        <li>À chaque <strong>cotisation</strong> (la caisse monte) et chaque <strong>allocation</strong>.</li>
        <li>Quand l'admin <strong>enregistre manuellement</strong> un versement pour vous (espèces / virement), vous recevez une notification personnelle.</li>
        <li>À la <strong>proposition d'un évènement</strong>, son <strong>activation</strong> et sa <strong>clôture</strong>.</li>
        <li>En cas de <strong>prêt impayé à l'échéance</strong> : la famille est avertie et le compte de l'emprunteur est automatiquement bloqué.</li>
        <li>Rappels d'<strong>abonnement</strong> avant échéance.</li>
      </ul>

      <h2 class="g-h2">🔒 Sécurité, fiabilité, confidentialité & transparence</h2>
      <p>
        <strong>Votre argent reste sur les comptes de la famille</strong> — pas sur ceux de l'application :
      </p>
      <ul>
        <li>Les cotisations sont versées directement sur le <strong>compte PayPal de la famille</strong> et / ou sur son <strong>compte Mobile Money</strong>. L'app <strong>ne stocke aucun mot de passe ni code d'accès</strong> à ces comptes ; ils restent gérés uniquement par votre administrateur familial.</li>
        <li>Les paiements sont <strong>adossés aux technologies sécurisées</strong> de <strong>PayPal</strong> (compte Business avec protection acheteur/vendeur) et de <strong>CinetPay</strong> (agrégateur Mobile Money certifié BEAC). Les transactions transitent par leurs infrastructures et bénéficient de leurs garanties.</li>
        <li>L'application n'a accès qu'aux <strong>confirmations de paiement</strong> (webhooks) — jamais aux numéros de carte ni aux mots de passe Mobile Money.</li>
        <li><strong>Vie privée</strong> : chaque membre voit <strong>sa propre part</strong> et <strong>sa propre participation</strong> à un évènement, <strong>jamais</strong> celles des autres. La caisse et les cagnottes n'affichent que des <strong>totaux</strong>. Le vote est <strong>anonyme</strong>.</li>
        <li><strong>Transparence</strong> : la caisse globale, les évènements, les décomptes de vote et les remboursements sont visibles par tous les membres actifs en temps réel.</li>
        <li><strong>Traçabilité</strong> : chaque écriture financière conserve la <strong>devise d'origine</strong> (€ ou FCFA) telle que saisie, le <strong>mode de versement</strong> et l'<strong>auteur de l'enregistrement</strong> (membre ou admin), pour une réconciliation simple avec les relevés PayPal / Mobile Money.</li>
      </ul>

      <h2 class="g-h2">💶 Abonnement</h2>
      <ul>
        <li><strong>30 jours gratuits</strong>, puis <strong>20 €/an</strong> (PayPal).</li>
        <li>Sans paiement : la famille est <strong>désactivée 1 mois</strong> (données conservées, l'admin peut régulariser), puis <strong>supprimée</strong> si toujours impayée.</li>
        <li>Vos comptes PayPal et Mobile Money <strong>vous appartiennent</strong> : vous ne perdez jamais votre argent même si vous arrêtez l'abonnement.</li>
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
