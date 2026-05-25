# M-FACAM — Family Cash Management

Application mobile de gestion d'une caisse de trésorerie familiale.

- **Backend** : NestJS + TypeORM + PostgreSQL
- **Mobile** : Ionic 7 + Angular 17 + Capacitor (Android / iOS)
- **Architecture** : multi-tenant, une base PostgreSQL par famille
- **Paiement** : PayPal (cotisations, allocations, versements responsables, abonnement)

## Vue d'ensemble

Chaque famille crée son espace via un abonnement annuel **10 €/an** (1 mois d'essai gratuit). Pendant l'essai, la base de données dédiée existe en mode probatoire ; si l'abonnement n'est pas confirmé à J+30, l'admin et la base sont supprimés automatiquement.

### Fonctionnalités principales

| Domaine | Description |
| --- | --- |
| Cotisations | Versements PayPal sur la caisse familiale, alimentant le solde personnel du membre |
| Évènements | Mariages, décès, projets, anniversaires ; date d'échéance, montant cible, responsable |
| Allocations | Chaque membre décide combien il alloue à un évènement depuis son propre solde |
| Confidentialité | Chaque membre voit son solde et ses propres parts ; jamais celles des autres |
| Arbre généalogique | Ascendants / descendants pour chaque membre, vue arbre interactive |
| Notifications | Création d'évènement, cotisations, allocations, anniversaires, rappel essai |
| Clôture automatique | À la date d'échéance, versement PayPal au responsable |
| Administration | Identifiant famille, PayPal famille, WhatsApp, abonnement |

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
