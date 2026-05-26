# Déploiement production sur Infomaniak (VPS) — M-FACAM

Runbook complet pour héberger **Family Cash Management** chez Infomaniak, sur **un seul VPS**
(API NestJS + PostgreSQL + mobile statique), avec votre **domaine Infomaniak** et HTTPS.

> **Pourquoi un VPS et pas une base managée ?** Le modèle « 1 base PostgreSQL par famille »
> utilise `CREATE DATABASE … WITH TEMPLATE`, qui exige un rôle **CREATEDB / propriétaire du template**.
> Les bases managées bridées (Neon, et la plupart des « Public Cloud Databases » managées) ne le
> permettent pas. Sur un VPS où vous êtes **root**, vous installez PostgreSQL vous-même → aucun blocage.

---

## 0. Architecture cible

```
                 Internet (HTTPS)
                       │
              ┌────────┴─────────┐
              │   Nginx (443)    │  ← certificats Let's Encrypt
              └───┬─────────┬────┘
   votre-domaine.fr        api.votre-domaine.fr
   (fichiers statiques)    (reverse proxy → 127.0.0.1:3000)
        │                        │
   /var/www/facam          PM2 → node dist/main (NestJS)
   (mobile www/browser)         │
                          PostgreSQL 16 (127.0.0.1:5432, NON exposé)
                          ├─ facam_master      (index familles + abonnements)
                          ├─ facam_template    (modèle cloné, is_template)
                          └─ facam_FAM_xxx…    (1 base par famille, créée à la volée)
```

---

## 1. Prérequis

- **VPS Infomaniak** : Manager Infomaniak → *Cloud / VPS* → créer un **VPS Cloud** (ou instance Public Cloud)
  sous **Ubuntu 22.04 LTS**. Recommandé pour démarrer : **2 vCPU / 4 Go RAM / 80 Go SSD**.
  Notez l'**IP publique** fournie.
- **Domaine** chez Infomaniak (ex. `votre-domaine.fr`), accès à la **zone DNS** dans le Manager.
- **Compte PayPal Business** (pour encaisser les abonnements 20 €/an) — voir [`paypal.md`](paypal.md).
- Le code sur GitHub : `https://github.com/Ambroise-fekra/m-facam`.

---

## 2. DNS (Manager Infomaniak → Domaines → Zone DNS)

Ajoutez deux enregistrements **A** pointant vers l'IP du VPS :

| Type | Nom    | Valeur (cible) |
|------|--------|----------------|
| A    | `@`    | `IP_DU_VPS`    |
| A    | `api`  | `IP_DU_VPS`    |

(`@` = la racine `votre-domaine.fr` pour le mobile ; `api` = `api.votre-domaine.fr` pour l'API.)
La propagation prend de quelques minutes à ~1 h.

---

## 3. Première connexion + sécurisation du VPS

```bash
ssh root@IP_DU_VPS

# Mises à jour + utilisateur non-root
apt update && apt upgrade -y
adduser facam && usermod -aG sudo facam

# Pare-feu : SSH + HTTP + HTTPS uniquement (PostgreSQL reste interne)
apt install -y ufw
ufw allow OpenSSH && ufw allow 80 && ufw allow 443
ufw --force enable
```

Reconnectez-vous ensuite en `facam` : `ssh facam@IP_DU_VPS` (puis `sudo` pour les commandes admin).

---

## 4. Installer Node 20, PostgreSQL 16, Nginx, Certbot, PM2

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# PostgreSQL 16 (dépôt officiel PGDG, pour coller à l'env de dev)
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update && sudo apt install -y postgresql-16

# Nginx + Certbot + PM2
sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx
sudo npm install -g pm2
```

---

## 5. PostgreSQL : rôle applicatif avec CREATEDB

Le rôle `facam` doit pouvoir **créer des bases** et **être propriétaire du template** (pour le cloner).
Un superuser n'est PAS nécessaire.

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE facam WITH LOGIN CREATEDB PASSWORD 'METTEZ_UN_MOT_DE_PASSE_FORT';
SQL
```

PostgreSQL écoute par défaut uniquement sur `127.0.0.1` — **ne pas** l'exposer. Laissez la config par
défaut (l'API et la base sont sur la même machine, connexion locale).

---

## 6. Déployer le backend (NestJS)

```bash
# Récupérer le code
sudo mkdir -p /opt/facam && sudo chown facam:facam /opt/facam
cd /opt/facam
git clone https://github.com/Ambroise-fekra/m-facam.git .
cd backend

# Dépendances (dev incluses : ts-node sert aux migrations)
npm ci
```

Créez le fichier d'environnement **`/opt/facam/backend/.env`** :

```dotenv
NODE_ENV=production
PORT=3000

PAYMENT_PROVIDER=paypal           # 'mock' pour un 1er test sans argent réel
PUBLIC_API_URL=https://api.votre-domaine.fr
EMAIL_PROVIDER=smtp               # voir §10 (sinon 'mock' = emails seulement journalisés)
APP_PUBLIC_URL=https://votre-domaine.fr

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=facam
DB_PASSWORD=METTEZ_UN_MOT_DE_PASSE_FORT   # le même qu'au §5
DB_MASTER_NAME=facam_master
DB_TEMPLATE_NAME=facam_template
DB_SSL=false                      # connexion locale → pas de SSL nécessaire

JWT_SECRET=GENEREZ_UNE_CHAINE_ALEATOIRE_64_CHARS
JWT_EXPIRES_IN=1d

PAYPAL_MODE=live
PAYPAL_CLIENT_ID=...              # app PayPal Business (live)
PAYPAL_CLIENT_SECRET=...
PAYPAL_SUBSCRIPTION_EMAIL=facturation@votre-domaine.fr

SUBSCRIPTION_PRICE_EUR=20
TRIAL_DAYS=30
```

> Générer un JWT secret : `openssl rand -hex 32`.

Build, migrations, puis démarrage permanent via PM2 :

```bash
cd /opt/facam/backend
npm run build

# Crée + migre la base master ET le template
npm run migrate:master
npm run migrate:template

# Marque le template comme "template" PostgreSQL (clonage fiable, protégé)
sudo -u postgres psql -c "ALTER DATABASE facam_template OWNER TO facam;"
sudo -u postgres psql -c "ALTER DATABASE facam_template WITH is_template true;"

# (Optionnel) jeu de démo pour un smoke-test — NE PAS faire en prod réelle
# npm run seed

# Démarrage géré par PM2 (redémarre au boot + après crash)
pm2 start dist/main.js --name facam-api
pm2 save
pm2 startup systemd -u facam --hp /home/facam   # suivez la commande affichée
```

Vérifiez : `curl http://127.0.0.1:3000/api` (ou la route de santé) doit répondre.

---

## 7. Déployer le mobile (Ionic/Angular statique)

Le build mobile embarque l'URL de l'API. **Sur votre PC** (pas le VPS), avant de builder :

1. Éditez `mobile/src/environments/environment.prod.ts` :
   ```ts
   export const environment = {
     production: true,
     apiBaseUrl: 'https://api.votre-domaine.fr/api',
   };
   ```
2. Rebuild : `cd mobile && npx ng build --configuration production`
3. Envoyez le contenu de `mobile/www/browser` sur le VPS :
   ```bash
   # depuis votre PC (Git Bash)
   scp -r mobile/www/browser/* facam@IP_DU_VPS:/tmp/facam-web/
   ```
4. Sur le VPS :
   ```bash
   sudo mkdir -p /var/www/facam
   sudo cp -r /tmp/facam-web/* /var/www/facam/
   sudo chown -R www-data:www-data /var/www/facam
   ```

> Astuce : vous pouvez aussi `git pull` le repo sur le VPS et builder le mobile directement dessus,
> mais builder sur votre PC évite d'installer toute la toolchain Angular sur le serveur.

---

## 8. Nginx : 2 vhosts (mobile statique + reverse proxy API)

Créez **`/etc/nginx/sites-available/facam`** :

```nginx
# --- Mobile (fichiers statiques, SPA) ---
server {
    listen 80;
    server_name votre-domaine.fr;
    root /var/www/facam;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # routage SPA (liens accept-invite, /help…)
    }
}

# --- API (reverse proxy vers NestJS) ---
server {
    listen 80;
    server_name api.votre-domaine.fr;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12M;            # photos en data-URL (avatars/logo)
    }
}
```

Activez + HTTPS :

```bash
sudo ln -s /etc/nginx/sites-available/facam /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Certificats Let's Encrypt (les 2 domaines d'un coup)
sudo certbot --nginx -d votre-domaine.fr -d api.votre-domaine.fr
# Choisir la redirection HTTP→HTTPS quand c'est proposé.
```

Certbot configure le renouvellement auto (timer systemd). Vérifiez : `sudo certbot renew --dry-run`.

---

## 9. PayPal (live) et email (SMTP)

- **PayPal** : suivez [`paypal.md`](paypal.md) pour créer l'app **live**, récupérer `CLIENT_ID`/`SECRET`
  et le plan d'abonnement. L'argent des abonnements arrive sur le compte propriétaire de ces clés.
  Pour un tout premier test sans argent réel, laissez `PAYMENT_PROVIDER=mock`.
- **Email SMTP Infomaniak** : le provider `smtp` de `EmailService` est **câblé** (nodemailer).
  Il suffit de renseigner les variables d'environnement et de mettre `EMAIL_PROVIDER=smtp` :
  ```dotenv
  EMAIL_PROVIDER=smtp
  SMTP_HOST=mail.infomaniak.com
  SMTP_PORT=587            # 587 = STARTTLS ; 465 = SSL (mettre SMTP_SECURE=true)
  SMTP_SECURE=false
  SMTP_USER=contact@votre-domaine.fr   # adresse complète de la boîte
  SMTP_PASS=...                          # mot de passe de la boîte
  SMTP_FROM=contact@votre-domaine.fr   # expéditeur affiché
  ```
  L'envoi est *best-effort* : si le SMTP échoue, la création de famille n'est pas bloquée
  (l'identifiant reste affiché à l'écran) et l'échec est journalisé. Créez la boîte mail dans
  le Manager Infomaniak (Service Mail) au préalable.

---

## 10. Sauvegardes PostgreSQL (cron quotidien)

Comme les bases familles sont créées dynamiquement, on sauvegarde **tout** le cluster :

```bash
sudo mkdir -p /var/backups/facam && sudo chown facam:facam /var/backups/facam
crontab -e   # en tant qu'utilisateur facam
```

Ajoutez :

```cron
0 3 * * * pg_dumpall -U facam -h 127.0.0.1 | gzip > /var/backups/facam/all_$(date +\%F).sql.gz && find /var/backups/facam -name '*.sql.gz' -mtime +14 -delete
```

(Conserve 14 jours. Pour un `pg_dumpall` sans mot de passe interactif, créez `~/.pgpass` :
`127.0.0.1:5432:*:facam:MOT_DE_PASSE` puis `chmod 600 ~/.pgpass`.)

> Pensez à copier régulièrement `/var/backups/facam` hors du VPS (Infomaniak kDrive, S3…).

---

## 11. Mettre à jour l'application

```bash
# Backend
cd /opt/facam && git pull
cd backend && npm ci && npm run build
# Si une nouvelle migration a été ajoutée :
npm run migrate:master && npm run migrate:template
pm2 reload facam-api

# Mobile : rebuild sur le PC (avec apiBaseUrl du domaine) puis re-scp dans /var/www/facam
```

> **Important multi-tenant** : si une migration **tenant** ajoute une colonne, il faut l'appliquer
> au template **ET** à chaque base `facam_FAM_*` existante (sinon TypeORM plante en lisant la colonne).
> Cf. la note récurrente du projet.

---

## 12. Checklist de lancement réel

- [ ] DNS `@` et `api` pointent sur le VPS, propagés.
- [ ] HTTPS actif sur les 2 domaines (cadenas vert), redirection HTTP→HTTPS.
- [ ] `pm2 status` → `facam-api` en `online`, `pm2 startup` configuré (survit au reboot).
- [ ] `facam_master` + `facam_template` (is_template=true) migrés ; rôle `facam` = CREATEDB.
- [ ] `environment.prod.ts` = `https://api.votre-domaine.fr/api`, mobile rebuildé et déployé.
- [ ] PayPal **live** configuré (ou `mock` assumé pour la phase de test).
- [ ] **Email SMTP câblé** (sinon les identifiants de famille ne partent pas).
- [ ] Sauvegarde `pg_dumpall` quotidienne testée (restauration vérifiée au moins une fois).
- [ ] Test bout-en-bout : créer une famille → recevoir l'identifiant → se connecter → cotiser.

---

## 13. Estimation des coûts (rappel)

| Poste | Coût indicatif |
|---|---|
| VPS Infomaniak (2 vCPU / 4 Go) | ~8–20 €/mois |
| Domaine Infomaniak (.fr ~8 € / .com ~16 € par an) | ~1 €/mois |
| Boîte mail (envoi SMTP), souvent incluse | 0–qqs €/an |
| **Total infra** | **~10–20 €/mois** |

Marge : abonnement **20 €/an** − commission PayPal (~1,03 €) ≈ **19 € net/famille**.
Rentabilité atteinte dès **~8–13 familles**. Un seul VPS héberge des **dizaines de familles**
sans changement de dimensionnement.
```
