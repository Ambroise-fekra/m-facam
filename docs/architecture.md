# Architecture M-FACAM

## Vue globale

```
┌─────────────────────────────────────────────────────────────┐
│  Mobile Ionic/Angular  ── HTTPS + JWT + X-Family-Id ──▶ API │
└─────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
                                            ┌────────────────────┐
                                            │ NestJS (port 3000) │
                                            └─┬────────────────┬─┘
                                              │                │
                                              ▼                ▼
                                ┌────────────────┐   ┌──────────────────────┐
                                │ facam_master   │   │ facam_FAM_xxx        │
                                │  - families    │   │  - members           │
                                │  - subscriptions│  │  - events            │
                                │  - member_dir  │   │  - event_votes       │
                                └────────────────┘   │  - contributions     │
                                                     │  - allocations       │
                                                     │  - loan_repayments   │
                                                     │  - external_contrib  │
                                                     │  - notifications     │
                                                     └──────────────────────┘
                                                       (clonée depuis
                                                        facam_template)
```

## Cycle d'une famille

1. **Inscription** — `POST /master/families` crée la ligne `families`, ouvre un abonnement `trial`, exécute `CREATE DATABASE facam_FAM_xxx WITH TEMPLATE facam_template`, insère l'admin. Email d'identifiant envoyé (provider mock ou SMTP nodemailer).
2. **Trial** — 30 jours (`TRIAL_DAYS`). Cron `subscriptions.lifecycle` à 03:00 :
   - Trial / actif échu → `state='past_due'` + `family.status='expired'` + `grace_ends_at = +30 j`.
   - Past_due dépassé → suppression définitive de la base (`dropTenantDatabase`).
3. **Conversion** — abonnement `20 €/an` (configurable via `SUBSCRIPTION_PRICE_EUR`) via PayPal Live (ou mock pour la phase de test).
4. **Cotisations** — chaque membre démarre une cotisation, capture asynchrone (webhook PayPal ou checkout mock).
5. **Évènements** — création par tout membre actif non bloqué (voir typologie ci-dessous).
6. **Clôture** — cron `events.auto-close` à 04:00. Comportement différencié selon le type (voir « Cycles d'évènements »).

## Rôles & droits

| Rôle | Désignation | Privilèges spécifiques |
| --- | --- | --- |
| **Admin** | Premier membre créé à l'inscription | Crée/modifie membres, paramètre la famille, déclare décès, active la connexion, débloque, peut activer/rejeter directement un vote |
| **Chef de famille** | Désigné par l'admin (`families.chief_member_id`) parmi les membres actifs | Active la connexion d'un membre, déclare un décès, modifie tout profil |
| **Membre actif** | `is_active=true AND deceased_at IS NULL AND is_blocked=false` | Vote, propose des évènements, alloue depuis sa part, contribue (externe), demande un prêt, déclare ses propres enfants |
| **Membre inactif** | `is_active=false` | Apparaît dans l'arbre, ne compte pas dans le quorum, ne peut pas se connecter ni participer |
| **Membre décédé** | `deceased_at IS NOT NULL` (implique `is_active=false`) | Reste dans l'arbre généalogique, exclu de toutes les opérations, exclu de la page Anniversaires |
| **Membre bloqué** | `is_blocked=true` (prêt impayé à l'échéance) | Ne peut plus voter, proposer, emprunter — débloqué manuellement par l'admin |

## Typologie des évènements

| Type | Description | Cotisation | Décaissement | Cas particuliers |
| --- | --- | --- | --- | --- |
| **Classique** (`wedding`, `death`, `project`, `birthday`, `other`) | Évènement de solidarité familiale | **Allocation** depuis la part de chaque membre | À l'échéance ou via « Clôturer maintenant », admin enregistre la remise des fonds au responsable (mode + note) | Objectif facultatif ; suggestion par membre |
| **Prêt** (`loan`) | Avance à un membre, à rembourser | **Remboursements** par l'emprunteur uniquement (table `loan_repayments`) | À l'activation, admin remet les fonds → caisse baisse du montant prêté | Plafond 1/5 de la caisse ; max 2 prêts actifs ; emprunteur exclu du vote/quorum ; blocage automatique si impayé à l'échéance |
| **Externe** (`external`) | Cagnotte hors solidarité commune | **Contributions ciblées** par n'importe quel membre (table `external_contributions`) | Idem évènement classique (remise au responsable) | Ne touche ni la part des membres ni la caisse globale |

## Trois flux financiers

| Flux | Table | Impact sur la part du membre | Impact sur la caisse globale |
| --- | --- | --- | --- |
| **Cotisation caisse** | `contributions` | ↑ part | ↑ caisse |
| **Allocation évènement classique** | `allocations` | ↓ part | inchangée (allocation interne) |
| **Remboursement prêt** | `loan_repayments` | aucun | ↑ caisse (compense le décaissement) |
| **Contribution externe** | `external_contributions` | aucun | aucun (cagnotte parallèle) |

### Calcul `totalCash` (caisse familiale disponible)

```
totalCash =   Σ(contributions.amount where status='completed')
            − Σ(allocations.amount)
            − Σ(events.target_amount where type='loan' AND payout_status='done')
            + Σ(loan_repayments.amount)
```

`loansOutstanding` (affiché en complément sur le dashboard) =
`Σ(target_amount des prêts actifs décaissés) − Σ(loan_repayments de ces prêts)`.

Les `external_contributions` n'entrent PAS dans le calcul (elles sont earmarkées).

## Vote — règle d'adoption

- **Quorum** : `voters ≥ ⌈ (2/3) × membres_actifs_non_décédés ⌉` (pour un prêt, on exclut l'emprunteur du dénominateur).
- **Majorité** : `yes ≥ ⌈ (2/3) × voters ⌉`.
- Adopté si **quorum atteint ET majorité atteinte**. Admin peut forcer `activate` ou `reject` directement.

## Cycles d'évènements

| État | Classique / Externe | Prêt |
| --- | --- | --- |
| **proposed** | Vote ouvert jusqu'à `decisionDeadline`. Cron `events.finalize-proposals` à 01:00 tranche à l'échéance. | Idem (emprunteur exclu). |
| **active** | Cotisations / contributions ouvertes jusqu'à `deadline`. | Décaissement par admin ; puis remboursements par l'emprunteur. |
| **closed** | À `deadline`, cron met `status='closed'`, `payout_status='pending'`. Admin enregistre la remise. | Auto à 100 % remboursé ; sinon **emprunteur bloqué** à l'échéance (event reste `active`). |
| **rejected** | Vote négatif ou admin reject. | Idem. |

## Confidentialité

- Tous les endpoints `*/me/*` filtrent sur `memberId` issu du JWT.
- `events/:id` renvoie deux agrégats : `totalCollected` (visible) et `myAllocation` (privé pour le membre).
- Les notifications n'embarquent jamais le montant individuel d'un autre membre.
- Le vote est **anonyme** — seuls les décomptes (yes/no) sont exposés.

## Modèle de données (tenant)

| Table | Clés étrangères | Notes |
| --- | --- | --- |
| `members` | `father_id`, `mother_id` → `members(id)` | `is_active`, `is_blocked`, `deceased_at`, `password_hash`, `invite_token`, `photo` (data URL 256 px) |
| `events` | `responsible_id`, `borrower_id`, `created_by` → `members(id)` | `type` ∈ {wedding, death, project, birthday, other, loan, external}, `target_amount` nullable (sauf prêt), `suggested_per_member`, `decision_deadline`, `payout_status/method/note/at` |
| `event_votes` | `(event_id, member_id)` UNIQUE | `value` ∈ {yes, no}, anonyme côté API |
| `contributions` | `member_id` → `members(id)` | Capture PayPal ou mock |
| `allocations` | `(event_id, member_id)` UNIQUE | Allocation classique (depuis la part) |
| `loan_repayments` | `event_id`, `member_id` → … | Remboursements de prêt par l'emprunteur |
| `external_contributions` | `event_id`, `member_id` → … | Cotisations ciblées sur évènement externe |
| `notifications` | `member_id` → `members(id)` | Une ligne par destinataire |

## Modèle de données (master)

| Table | Notes |
| --- | --- |
| `families` | `identifier` UNIQUE (routage), `db_name`, `status`, `chief_member_id` (cross-DB, validé par l'app), `paypal_email`, `whatsapp_url`, `photo`, `admin_email_verified`, `email_verify_token` |
| `member_directory` | Email → identifiant famille (récupération d'identifiant oublié) |
| `subscriptions` | 1↔1 avec `families`, états `trial`/`active`/`past_due`/`deleted`, `grace_ends_at`, `price_eur` (default 20) |

## Migrations

Idempotentes (`IF NOT EXISTS` / `DROP NOT NULL` / DO-block pour CHECK).

- **Master** : `001_init_master`, `002_member_directory`, `003_email_grace`, `004_family_photo`, `005_family_chief`.
- **Tenant** : `001_init_tenant`, `002_voting`, `003_member_invite`, `004_member_photo`, `005_member_email_nullable`, `006_event_payout`, `007_loan`, `008_member_deceased`, `009_external_event`.

Scripts :
- `npm run migrate:master` — applique sur `facam_master`.
- `npm run migrate:template` — applique sur `facam_template`.
- `npm run migrate:tenants` — itère sur toutes les bases familles existantes (`facam_FAM_*`) et applique les migrations tenant. À lancer après chaque évolution de schéma tenant.

## Routes principales

### Auth & famille

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/master/families` | — | Création famille (admin compris) |
| POST | `/auth/login` | — | Connexion (identifier + email + password) |
| POST | `/auth/recover-identifier` | — | Renvoi des identifiants par email |
| GET | `/auth/invite-info` | — | Détail d'une invitation (`identifier + token`) |
| POST | `/auth/accept-invite` | — | Le nouveau membre définit son mot de passe |
| GET | `/admin/family` | JWT + admin | Détails famille (avec abonnement) |
| PATCH | `/admin/family` | JWT + admin | MAJ paypalEmail, whatsappUrl, photo, **chiefMemberId** |

### Membres

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/members` | JWT | Liste enrichie (parents, enfants, `canLogin`, `isActive`, `isBlocked`, `deceasedAt`) |
| GET | `/members/me` | JWT | Membre courant |
| GET | `/members/family-info` | JWT | Famille + admin + chef (nom + tel) |
| GET | `/members/birthdays` | JWT | Anniversaires mois courant + suivant (défunts exclus) |
| GET | `/members/:id` | JWT | Détail |
| POST | `/members` | JWT + admin | Crée un membre (email facultatif si pas de connexion) |
| PATCH | `/members/:id` | JWT (self / admin / chef) | MAJ profil ; **`deceasedAt`** réservé admin/chef |
| POST | `/members/:id/photo` | JWT (self / admin) | MAJ photo (data URL) |
| POST | `/members/descendants` | JWT (membre actif M/F) | Déclare un enfant (créé inactif) |
| POST | `/members/:id/enable-login` | JWT + admin/chef | Active la connexion (génère invite token) |
| POST | `/members/:id/block` `/unblock` | JWT + admin | Bloque/débloque (prêt impayé) |

### Caisse & transactions

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/contributions/cash` | JWT | `totalCash`, `totalAllocated`, **`loansOutstanding`**, `loansActiveCount` |
| GET | `/contributions/me/balance` | JWT | Solde personnel |
| POST | `/contributions` | JWT | Démarre une cotisation (checkout) |
| GET | `/transactions/me` | JWT | Historique perso |

### Évènements & vote

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/events` | JWT | Liste enrichie (tally pour `proposed`, `myAllocation` privé) |
| GET | `/events/:id` | JWT | Détail |
| POST | `/events` | JWT (actif, non bloqué, non décédé) | Crée évènement (`type`, dont `loan` / `external`) |
| POST | `/events/:id/vote` | JWT | Voter (yes/no) — refusé pour l'emprunteur d'un prêt |
| POST | `/events/:id/activate` `/reject` | JWT + admin | Décision directe |
| POST | `/events/:id/close` | JWT + admin | Clôture anticipée |
| POST | `/events/:id/settle` | JWT + admin | Enregistre la remise au responsable (mode + note) |

### Allocations / prêts / externes

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/allocations` | JWT (actif) | Alloue depuis sa part vers un évènement classique (refusé pour loan/external) |
| POST | `/events/:id/repayments` | JWT (emprunteur / admin) | Enregistre un remboursement de prêt |
| GET | `/events/:id/repayments` | JWT (emprunteur / admin) | Historique |
| POST | `/events/:id/external-contributions` | JWT (actif non bloqué non décédé) | Cotisation ciblée pour évènement externe |
| GET | `/events/:id/external-contributions` | JWT | Historique des contributions externes |

### Généalogie, notifications, abonnement

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/genealogy/tree` | JWT | Forêt par couples (père ❤️ mère + enfants) |
| GET | `/notifications` | JWT | Mes notifications |
| PATCH | `/notifications/:id/read` | JWT | Marque lue |
| GET | `/master/subscriptions/mine` | JWT | Statut abonnement |
| POST | `/master/subscriptions/upgrade` | JWT + admin | Lien PayPal d'upgrade |
| POST | `/paypal/webhook` | — | Webhook PayPal (signature à vérifier en live) |

## Modules backend

```
src/
├── master/
│   ├── families/                  (entity, service, controller, DTOs)
│   ├── subscriptions/             (cycle de vie + crons)
│   └── tenant/                    (TenantRoutingService, @Global)
├── tenant/
│   ├── auth/
│   ├── members/                   (CRUD + déclaration descendance + block/unblock + enable-login)
│   ├── events/                    (CRUD + vote + settle + close + crons)
│   ├── contributions/             (cotisations à la caisse)
│   ├── allocations/               (allocations classiques, refuse loan/external)
│   ├── loans/                     (LoanRepayment + service + controller)
│   ├── external/                  (ExternalContribution + service + controller)
│   ├── transactions/              (vue agrégée perso)
│   ├── genealogy/                 (arbre par couples)
│   ├── notifications/
│   └── admin/                     (MAJ paramètres famille + chief)
├── payments/                      (PaymentProvider interface ; mock + paypal)
├── email/                         (EmailService, mock + smtp nodemailer)
└── database/                      (run-migrations.ts master/template/tenants-all, seed.ts)
```

## À implémenter ensuite

- Vérification de signature PayPal (`PAYPAL-TRANSMISSION-SIG`) dans un guard pour le webhook live.
- Dispatcher FCM (Firebase Admin déjà en dépendance) pour pousser les notifications côté mobile.
- Tâche cron d'anniversaires des membres → notification + message WhatsApp.
- Onboarding & seed `facam_template` automatique au démarrage du backend (migrations idempotentes).
- Tests E2E avec un PostgreSQL éphémère par worker Jest.
- Conversion des contributions externes / remboursements via flux PayPal (actuellement enregistrés manuellement).
