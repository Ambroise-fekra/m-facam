# M-FACAM — Family Cash Management

Application mobile de gestion d'une caisse de trésorerie familiale.

- **Backend** : NestJS + TypeORM + PostgreSQL
- **Mobile** : Ionic 7 + Angular 17 + Capacitor (Android / iOS)
- **Architecture** : multi-tenant, une base PostgreSQL par famille
- **Paiements** : **PayPal** (cotisations, allocations, versements responsables, abonnement) + **Mobile Money via CinetPay** (Congo, FCFA — Phase 2)
- **Multi-devise** : EUR (canonique) + FCFA BEAC (parité fixe 1 € = 655,957 FCFA), saisie et affichage dans la devise d'origine sans perte d'arrondi

## Vue d'ensemble

Chaque famille crée son espace via un abonnement annuel **20 €/an** (1 mois d'essai gratuit). Pendant l'essai, la base de données dédiée existe en mode probatoire ; si l'abonnement n'est pas confirmé à J+30, l'admin et la base sont supprimés automatiquement.

### Fonctionnalités principales

| Domaine | Description |
| --- | --- |
| **Rôles** | Admin (création/gestion) + **chef de famille** (désigné, mêmes pouvoirs pour activer un membre, marquer un décès, prolonger un évènement) ; affichés ensemble sur le dashboard avec leurs téléphones |
| **Membres** | Créés par l'admin avec **email OU téléphone** OU déclarés par chaque parent depuis son profil (descendance + **conjoint(e)**). Champ **surnom** facultatif. Statuts : actif / inactif / 🚫 bloqué / 🕯️ décédé |
| **Multi-familles** | Un même email peut appartenir à plusieurs familles (récupération d'identifiant renvoie tous les identifiants) |
| **Cotisations caisse** | Versements **PayPal** (€) ou **Mobile Money** (FCFA, Congo) sur la caisse, alimentant le solde personnel ; **saisie manuelle admin** pour les versements hors-app (espèces, virement) |
| **Évènements classiques** | Mariages, décès, projets, anniversaires ; objectif facultatif + suggestion par membre ; **réactivation possible** par admin/chef tant que le versement n'a pas été fait |
| **💰 Prêt à un membre** | Voté (emprunteur exclu), plafond 1/5 caisse, max 2 actifs ; remboursements en € ou FCFA ; blocage automatique en cas d'impayé |
| **🎁 Évènement externe** | Cagnotte hors solidarité commune ; cotisations ciblées qui ne touchent ni la part du membre ni la caisse globale |
| **Vote** | Quorum 2/3 des actifs + majorité 2/3 des votants ; affichage explicite des règles avec ✅/❌ |
| **Multi-devise** | Saisie en € **ou** FCFA sur cotisation, allocation, contribution externe, remboursement. Stockage canonique EUR + conservation de l'original (XAF/EUR) ; affichage fidèle dans la devise de paiement |
| **Clôture & versement** | À l'échéance, l'admin remet le total au responsable (virement, espèces, chèque, **PayPal**, **Mobile Money**) avec rappel des coordonnées de paiement (PayPal email / numéro Mobile Money + opérateur) du responsable |
| **Correction admin** | Suppression d'une cotisation, allocation, contribution externe, ou remboursement erroné — solde automatiquement recalculé |
| **Confidentialité** | Chaque membre voit son solde et ses propres parts ; jamais celles des autres. Vote anonyme |
| **Arbre généalogique** | Affichage par **couples** (père ❤️ mère + enfants), bordure colorée par sexe ; conjoint(e) déclarable par admin/chef même pour un décédé |
| **Anniversaires** | Mois courant + suivant, défunts exclus par respect |
| **Photos** | Avatar et logo famille avec **recadrage rond** (glisser/zoomer) |
| **Notifications** | Cotisations, allocations, propositions, activations, clôtures, versements manuels enregistrés par l'admin, prêts impayés, rappels d'abonnement |
| **Administration** | Identifiant famille, PayPal + Mobile Money famille, WhatsApp, chef de famille, abonnement, blocage/déblocage |
| **Sécurité** | L'app n'a **aucun code d'accès** PayPal / Mobile Money. L'argent reste sur les comptes gérés par la famille. Paiements adossés aux infrastructures **PayPal** et **CinetPay** |
| **Démocratique** | Chaque évènement (proposition, prêt, externe) est soumis au **vote anonyme** modifiable jusqu'à l'échéance, avec quorum 2/3 et majorité 2/3. Sur un prêt l'**emprunteur est exclu** du vote |

## Architecture multi-tenant

Deux types de bases PostgreSQL :

1. **`facam_master`** — base centrale unique
   - Index des familles, abonnements, routage tenant
   - Table `families` (identifier → db_name)
2. **`facam_template`** — modèle de base famille (jamais utilisée en prod)
3. **`facam_<IDENTIFIER>`** — une par famille, clonée depuis `facam_template`
   - Membres, évènements, contributions, allocations, transactions, notifications

À la connexion, l'identifiant de famille fourni par l'utilisateur résout la base à utiliser via `TenantService`, qui maintient un pool de connexions par tenant.

## Démarrage rapide

```powershell
# Pré-requis : Node 20+, Docker Desktop, Ionic CLI
npm install -g @ionic/cli @nestjs/cli

# 1. PostgreSQL
docker compose up -d postgres

# 2. Bases master + template
cd backend; npm install
npm run migrate:master
npm run migrate:template

# 3. Données de démo
npm run seed
#  → famille FAM-DUPONT-DEMO / admin@dupont.demo / demo1234

# 4. Backend
npm run start:dev          # http://localhost:3000/api  (swagger sur /api/docs)

# 5. Mobile (autre terminal)
cd ..\mobile; npm install
ionic serve                # http://localhost:8100
```

Documentation détaillée :

- [`docs/testing.md`](docs/testing.md) — procédure de test pas à pas
- [`docs/paypal.md`](docs/paypal.md) — configuration PayPal sandbox → live
- [`docs/deployment.md`](docs/deployment.md) — mise en production
- [`docs/architecture.md`](docs/architecture.md) — modèle, modules, confidentialité

## Structure du projet

```
M-FACAM/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── master/          # Modules de la base master (familles, abos, tenant)
│   │   ├── tenant/          # Modules tenant (auth, members, events, ...)
│   │   ├── paypal/          # Intégration PayPal + webhooks
│   │   └── common/          # Guards, interceptors, DTO
│   └── src/database/        # Migrations master + template
├── mobile/                  # App Ionic
│   └── src/app/
│       ├── core/            # Services, guards, interceptors
│       ├── pages/           # Écrans (lazy-loaded)
│       └── shared/          # Composants & pipes réutilisables
├── docs/                    # Maquettes HTML & spécifications
└── docker-compose.yml
```

Voir [`docs/architecture.md`](docs/architecture.md) pour le détail des modules.
