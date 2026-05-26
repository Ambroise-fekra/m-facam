# Déploiement en production — M-FACAM

## Topologie cible

```
          ┌──────────────────────┐
          │  Apps mobiles iOS/   │
          │  Android (Capacitor) │
          └──────────┬───────────┘
                     │ HTTPS
                     ▼
          ┌──────────────────────┐
          │   CDN / Reverse      │  Nginx / Caddy / Cloudflare
          │   proxy + TLS        │
          └──────────┬───────────┘
                     │
                     ▼
       ┌──────────────────────────┐
       │ NestJS API (2+ replicas) │  Docker / Kubernetes / Fly.io
       └───────┬──────────────────┘
               │ TCP 5432
               ▼
       ┌──────────────────────────┐
       │ PostgreSQL managé        │  RDS, Cloud SQL, Scaleway, OVH
       │  - facam_master          │  Backups quotidiens
       │  - facam_template        │  PITR 7 jours
       │  - facam_<FAMILY>×N      │
       └──────────────────────────┘
```

## 1. Pré-requis de production

| Élément | Recommandation |
| --- | --- |
| Node | 20 LTS |
| PostgreSQL | 16 (managé, sauvegarde automatique, PITR activé) |
| Certificats TLS | Let's Encrypt via Caddy, ou Cloudflare |
| Secrets | Vault / Doppler / SOPS — **jamais** dans le repo |
| Monitoring | Sentry (erreurs) + Grafana + Loki (logs + métriques) |
| File d'attente notifications | BullMQ (Redis) une fois FCM activé |

## 2. Préparation du serveur de base de données

```sql
CREATE USER facam WITH PASSWORD '<long random>';
CREATE DATABASE facam_master OWNER facam;
CREATE DATABASE facam_template OWNER facam;
-- Permet à `facam` de cloner facam_template lors des inscriptions.
ALTER DATABASE facam_template IS_TEMPLATE = true;
ALTER USER facam WITH CREATEDB;     -- requis pour CREATE DATABASE … WITH TEMPLATE
```

Appliquer les migrations depuis un poste avec accès à la prod :

```powershell
$env:DB_HOST="<prod-host>"; $env:DB_USER="facam"; $env:DB_PASSWORD="<...>"
npm run migrate:master
npm run migrate:template
```

> **Ne jamais** exécuter `npm run seed` en production.

## 3. Variables d'environnement à fournir

| Clé | Description |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (derrière reverse proxy) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | PostgreSQL managé |
| `DB_MASTER_NAME` | `facam_master` |
| `DB_TEMPLATE_NAME` | `facam_template` |
| `JWT_SECRET` | 32+ caractères aléatoires (`openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `1d` |
| `PAYPAL_MODE` | `live` |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | App PayPal Live |
| `PAYPAL_SUBSCRIPTION_PLAN_ID`, `PAYPAL_WEBHOOK_ID` | Voir [paypal.md](paypal.md) |
| `SUBSCRIPTION_PRICE_EUR` | `20` |
| `TRIAL_DAYS` | `30` |
| `FCM_PROJECT_ID`, `FCM_PRIVATE_KEY`, `FCM_CLIENT_EMAIL` | Firebase pour les push |

## 4. Build et déploiement du backend

### Option A — Docker simple (VPS)

```powershell
cd C:\Dev\M-FACAM\backend
docker build -t facam-backend:1.0.0 .
docker push <registry>/facam-backend:1.0.0
```

Sur le serveur :

```bash
docker run -d --name facam-backend --restart always \
  --env-file /etc/facam/backend.env \
  -p 127.0.0.1:3000:3000 \
  <registry>/facam-backend:1.0.0
```

Nginx en façade (`/etc/nginx/sites-available/facam`) :

```nginx
server {
  listen 443 ssl http2;
  server_name api.familycash.example;
  ssl_certificate     /etc/letsencrypt/live/api.familycash.example/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.familycash.example/privkey.pem;

  client_max_body_size 5m;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }
}
```

### Option B — Plateforme managée

- **Fly.io** : `fly launch` puis `fly deploy` (le `Dockerfile` du repo convient).
- **Render / Railway** : connecter le repo, exposer le port 3000, brancher PostgreSQL managé.
- **Kubernetes** : déployer un `Deployment` (2+ replicas) + `Service` + `Ingress`. Stocker `.env` dans un `Secret`.

## 5. Build et publication du mobile

Pré-requis : Android Studio (SDK + emulator), Xcode (uniquement sur macOS pour iOS).

### Android

```powershell
cd C:\Dev\M-FACAM\mobile
ionic build --prod
npx cap add android        # une seule fois
npx cap sync android
npx cap open android       # ouvre Android Studio
```

Dans Android Studio :

1. *Build* → *Generate Signed Bundle / APK* → AAB
2. Créer ou réutiliser une clé de signature.
3. Uploader le `.aab` dans **Google Play Console** → *Production*.

### iOS (sur macOS)

```bash
cd mobile
ionic build --prod
npx cap add ios
npx cap sync ios
npx cap open ios          # ouvre Xcode
```

Dans Xcode : *Product* → *Archive* → *Distribute App* → App Store Connect.

### URL API en production

Avant de builder, vérifier `src/environments/environment.prod.ts` :

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.familycash.example/api',
};
```

## 6. Sauvegardes et reprise sur sinistre

| Quoi | Comment | Rétention |
| --- | --- | --- |
| `facam_master` | Snapshot quotidien automatique du SGBD managé | 30 jours |
| `facam_<famille>` (chacune) | Idem + WAL pour PITR | 7 jours minimum |
| Test de restauration | Restaurer une famille au hasard une fois par mois sur un environnement staging | — |

> Avec **une base par famille**, surveiller le nombre de bases : viser **< 500 par instance**. Au-delà, prévoir un sharding ou basculer vers la stratégie « schéma par famille ».

## 7. Sécurité — checklist avant ouverture publique

- [ ] `JWT_SECRET` ≥ 32 chars, généré au déploiement
- [ ] HTTPS partout (HSTS dans Nginx)
- [ ] Rate limiting sur `/auth/login` et `/master/families` (10 req/min/IP)
- [ ] Logs sans PII (jamais le mot de passe ni le token)
- [ ] Vérification signature PayPal sur le webhook
- [ ] Politique RGPD : export + suppression des données d'une famille à la demande
- [ ] `helmet()` middleware ajouté dans `main.ts`
- [ ] Tests E2E qui couvrent les règles de confidentialité (un membre ne peut pas lire le solde d'un autre)

## 8. Surveillance opérationnelle

| Métrique | Seuil d'alerte |
| --- | --- |
| Familles en `trial` < 3 jours non converties | Notification commerciale |
| Cron `purge-trials` n'a pas tourné depuis 25h | Alerte critique |
| Webhook PayPal erreurs > 5/h | Alerte critique |
| Latence API `p95` > 800 ms | Alerte mineure |
| Connexions PostgreSQL > 80 % du pool | Scale up |

## 9. Migration de version

À chaque release backend :

1. Tag git `vX.Y.Z`, build & push de l'image.
2. Mettre à jour `facam_template` **avant** les bases familles (ajout colonne, défaut compatible).
3. Boucle de migration sur toutes les bases familles :

```typescript
// script utilitaire à écrire (TODO)
for (const family of await familyRepo.find({ where: { status: 'active' } })) {
  const ds = await tenantRouting.getDataSourceFor(family.identifier);
  await applyTenantMigrations(ds);
}
```

4. Redéployer l'API.
5. Vérifier la santé : `GET /api/health` (endpoint à exposer — `@nestjs/terminus`).
