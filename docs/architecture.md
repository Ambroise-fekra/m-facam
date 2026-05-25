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
                                ┌────────────────┐   ┌──────────────────┐
                                │ facam_master   │   │ facam_FAM_xxx    │
                                │  - families    │   │  - members       │
                                │  - subs        │   │  - events        │
                                └────────────────┘   │  - contributions │
                                                     │  - allocations   │
                                                     │  - notifications │
                                                     └──────────────────┘
                                                       (clonée depuis
                                                        facam_template)
```

## Cycle d'une famille

1. **Inscription** — `POST /master/families` crée la ligne `families`, ouvre un abonnement `trial`, exécute `CREATE DATABASE facam_FAM_xxx WITH TEMPLATE facam_template`, insère l'admin.
2. **Trial** — 30 jours par défaut (`TRIAL_DAYS`). Cron `subscriptions.purge-trials` à 03:00 supprime base + compte si non converti.
3. **Conversion** — webhook PayPal `BILLING.SUBSCRIPTION.ACTIVATED` → `SubscriptionsService.confirmPayment` passe `state='active'` et `family.status='active'`.
4. **Cotisations** — chaque membre démarre une commande PayPal, capture asynchrone via webhook met `status='completed'`.
5. **Évènements** — création par n'importe quel membre, allocation depuis le solde personnel.
6. **Clôture** — cron `events.auto-close` à 04:00 ; `PaypalService.payout` reverse au responsable.

## Confidentialité

- Tous les endpoints `contributions/me/*`, `transactions/me`, `events/:id` filtrent sur `memberId` issu du JWT.
- Aucun endpoint ne retourne `Contribution.memberId` ou `Allocation.memberId` à un autre membre.
- `events/:id` renvoie deux agrégats : `totalCollected` (visible) et `myAllocation` (privé).
- Les notifications n'embarquent jamais le montant individuel d'un autre membre.

## Modèle de données (tenant)

| Table | Clés étrangères | Notes |
| --- | --- | --- |
| `members` | `father_id`, `mother_id` → `members(id)` | Self-référencé pour l'arbre |
| `events` | `responsible_id` → `members(id)` | Statut `active → closed` à la deadline |
| `contributions` | `member_id` → `members(id)` | PayPal capture |
| `allocations` | `(event_id, member_id)` UNIQUE | Cumul par couple |
| `notifications` | `member_id` → `members(id)` | Une ligne par destinataire |

## Modèle de données (master)

| Table | Notes |
| --- | --- |
| `families` | `identifier` (UNIQUE, sert au routage), `db_name`, `status` |
| `subscriptions` | 1↔1 avec `families`, états `trial`/`active`/`past_due`/`cancelled`/`deleted` |

## Routes principales

| Méthode | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/master/families` | — | Inscription famille |
| POST | `/auth/login` | — | Connexion (identifier + email + password) |
| GET | `/contributions/me/balance` | JWT | Solde personnel |
| GET | `/contributions/cash` | JWT | Caisse globale (agrégat) |
| POST | `/contributions` | JWT | Démarrer une cotisation PayPal |
| GET | `/events` | JWT | Liste + `myAllocation` |
| POST | `/events` | JWT | Créer évènement |
| POST | `/allocations` | JWT | Allouer une part |
| GET | `/transactions/me` | JWT | Historique perso |
| GET | `/members` | JWT | Liste famille |
| POST | `/members` | JWT + admin | Ajouter un membre |
| GET | `/genealogy/tree` | JWT | Forêt généalogique |
| GET | `/notifications` | JWT | Mes notifications |
| GET | `/master/subscriptions/mine` | JWT | Statut abonnement |
| POST | `/master/subscriptions/upgrade` | JWT + admin | Lien PayPal d'upgrade |
| POST | `/paypal/webhook` | — | Webhook PayPal (signature à vérifier) |

## À implémenter ensuite

- Vérification de signature PayPal (`PAYPAL-TRANSMISSION-SIG`) dans un guard.
- Dispatcher FCM (Firebase Admin déjà en dépendance) pour pousser les notifications côté mobile.
- Tâche cron d'anniversaires des membres → notification.
- Onboarding & seed `facam_template` automatique au démarrage du backend (migrations idempotentes).
- Tests E2E avec un PostgreSQL éphémère par worker Jest.
