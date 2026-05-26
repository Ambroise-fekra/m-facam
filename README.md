# M-FACAM — Family Cash Management

Application mobile de gestion d'une caisse de trésorerie familiale.

- **Backend** : NestJS + TypeORM + PostgreSQL
- **Mobile** : Ionic 7 + Angular 17 + Capacitor (Android / iOS)
- **Architecture** : multi-tenant, une base PostgreSQL par famille
- **Paiement** : PayPal (cotisations, allocations, versements responsables, abonnement)

## Vue d'ensemble

Chaque famille crée son espace via un abonnement annuel **20 €/an** (1 mois d'essai gratuit). Pendant l'essai, la base de données dédiée existe en mode probatoire ; si l'abonnement n'est pas confirmé à J+30, l'admin et la base sont supprimés automatiquement.

### Fonctionnalités principales

| Domaine | Description |
| --- | --- |
| **Rôles** | Admin (création/gestion) + **chef de famille** (désigné, mêmes pouvoirs pour activer un membre et marquer un décès) ; affichés ensemble sur le dashboard avec leurs téléphones |
| **Membres** | Créés par l'admin OU **déclarés par chaque parent** depuis son profil (descendance). Statuts : actif / inactif / 🚫 bloqué / 🕯️ décédé |
| **Cotisations caisse** | Versements PayPal sur la caisse familiale, alimentant le solde personnel du membre |
| **Évènements classiques** | Mariages, décès, projets, anniversaires, autres ; objectif facultatif + suggestion par membre, date, échéance, responsable |
| **💰 Prêt à un membre** | Demandé par l'emprunteur, voté (emprunteur exclu), plafond 1/5 caisse, max 2 actifs ; remboursements par l'emprunteur uniquement ; blocage automatique en cas d'impayé |
| **🎁 Évènement externe** | Cagnotte hors solidarité commune : cotisations ciblées qui ne touchent ni la part du membre ni la caisse globale |
| **Vote** | Quorum 2/3 des actifs + majorité 2/3 des votants ; affichage explicite des règles avec ✅/❌ |
| **Clôture** | À l'échéance, l'admin enregistre la remise au responsable (virement / espèces / chèque / PayPal + note) |
| **Confidentialité** | Chaque membre voit son solde et ses propres parts ; jamais celles des autres. Vote anonyme |
| **Arbre généalogique** | Affichage par **couples** (père ❤️ mère + enfants), bordure colorée par sexe |
| **Anniversaires** | Mois courant + suivant, défunts exclus par respect |
| **Photos** | Avatar et logo famille avec **recadrage rond** (glisser/zoomer, modale tactile) |
| **Notifications** | Cotisations, allocations, propositions, activations, clôtures, prêts impayés, rappels d'abonnement |
| **Administration** | Identifiant famille, PayPal famille, WhatsApp, chef de famille, abonnement, blocage/déblocage |

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
