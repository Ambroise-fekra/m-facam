# Déploiement test gratuit — Railway (DB) + Render (API) + Netlify (mobile)

Objectif : une URL à partager à la famille pour tester depuis leurs téléphones.

> **Pourquoi Railway et pas Neon ?** L'app crée une base par famille via
> `CREATE DATABASE … WITH TEMPLATE facam_template`. Cela exige un rôle avec
> `CREATEDB` (superuser). Railway fournit le superuser `postgres` ; Neon et
> Render‑PostgreSQL non. On garde Render pour l'API et Netlify pour le mobile.

Le backend est déjà **compatible SSL** : il suffit de `DB_SSL=true`.

---

## Étape 1 — Base PostgreSQL (Railway)

1. Crée un compte sur https://railway.app → **New Project** → **Provision PostgreSQL**.
2. Onglet **Variables** / **Connect** du service Postgres : note `PGHOST`, `PGPORT`, `PGUSER` (=`postgres`), `PGPASSWORD`, `PGDATABASE`.
3. Crée les bases `facam_master` et `facam_template`. Dans l'onglet **Data** (ou via `psql`/un client) exécute :
   ```sql
   CREATE DATABASE facam_master;
   CREATE DATABASE facam_template;
   ALTER DATABASE facam_template IS_TEMPLATE = true;
   ```
   (le user `postgres` de Railway a déjà `CREATEDB`).

## Étape 2 — Migrer + seed (depuis ton PC, vers Railway)

Dans `backend/`, lance les migrations en pointant l'env vers Railway :
```powershell
$env:DB_HOST="<PGHOST>"; $env:DB_PORT="<PGPORT>"; $env:DB_USER="postgres"; $env:DB_PASSWORD="<PGPASSWORD>"
$env:DB_MASTER_NAME="facam_master"; $env:DB_TEMPLATE_NAME="facam_template"; $env:DB_SSL="true"
npm run migrate:master
npm run migrate:template
npm run seed        # optionnel : famille démo
```

## Étape 3 — Backend (Render)

1. Pousse le code sur un repo GitHub.
2. https://render.com → **New** → **Web Service** → connecte le repo, **Root Directory** = `backend`, runtime **Docker** (le `Dockerfile` est détecté).
3. **Environment** → ajoute :
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=<PGHOST>
   DB_PORT=<PGPORT>
   DB_USER=postgres
   DB_PASSWORD=<PGPASSWORD>
   DB_MASTER_NAME=facam_master
   DB_TEMPLATE_NAME=facam_template
   DB_SSL=true
   JWT_SECRET=<32+ caractères aléatoires>
   JWT_EXPIRES_IN=1d
   PAYMENT_PROVIDER=mock
   EMAIL_PROVIDER=mock
   SUBSCRIPTION_PRICE_EUR=20
   TRIAL_DAYS=30
   PUBLIC_API_URL=https://<ton-backend>.onrender.com
   APP_PUBLIC_URL=https://<ton-site-netlify>
   ```
4. Déploie. Vérifie `https://<ton-backend>.onrender.com/api/docs` (200).
   > Render free se met en veille après inactivité (1er appel ~50 s, normal).

## Étape 4 — Mobile (Netlify)

1. Édite `mobile/src/environments/environment.prod.ts` :
   ```typescript
   export const environment = {
     production: true,
     apiBaseUrl: 'https://<ton-backend>.onrender.com/api',
   };
   ```
2. Build :
   ```powershell
   cd mobile
   ionic build --prod
   ```
3. https://app.netlify.com → **Add new site** → **Deploy manually** → glisse le dossier **`mobile/www/browser`**.
   - ⚠️ Angular 17 génère la sortie web dans **`www/browser/`** (pas `www/`). Le routage SPA est déjà géré : le fichier `_redirects` (`/* /index.html 200`) est inclus automatiquement dans le build.
4. Récupère l'URL Netlify, reporte-la dans `APP_PUBLIC_URL` (Render) si besoin.

## Étape 5 — Tester

Ouvre l'URL Netlify sur ton téléphone → crée une famille (l'identifiant s'affiche) → invite des membres par WhatsApp. Paiements en **mock** (aucun argent réel).

---

## Limites du test gratuit
- **Connexions DB** : 1 pool par famille. Pour un test (quelques familles) c'est OK ; à grande échelle, prévoir un Postgres dédié ou la stratégie « schéma par famille ».
- **Render free** : veille/cold start.
- **Railway** : crédit d'essai limité.

## Passage en vrai PayPal / Email
Voir `docs/distribution.md` §4 et `docs/paypal.md` : `PAYMENT_PROVIDER=paypal`, `EMAIL_PROVIDER=smtp` + clés.
