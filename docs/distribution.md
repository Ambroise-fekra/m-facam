# Partager en test, mettre en production, distribuer & brancher PayPal

Ce guide complète `deployment.md` (infra serveur) et `paypal.md` (détails PayPal).

L'app a 2 briques à héberger :
- **Backend** NestJS + PostgreSQL (l'API + les bases familles)
- **Mobile** Ionic/Angular — qui est aussi une **app web** (PWA) : on peut donc la partager par simple URL, ou l'empaqueter en app Android/iOS via Capacitor.

---

## 1. Partager une version de test à des tiers

### Option A — Web (la plus simple, recommandée pour des testeurs non techniques)
On déploie le backend + une base managée, et le mobile en site statique. Les testeurs ouvrent juste une **URL**.

1. **Base** : créer un PostgreSQL managé (Neon, Supabase, Scaleway, RDS…). Appliquer les migrations (`migrate:master`, `migrate:template`).
2. **Backend** : déployer sur **Render / Railway / Fly.io** (le `Dockerfile` convient). Variables d'env : `DB_*`, `JWT_SECRET`, `PAYMENT_PROVIDER=mock` (pour le test), `EMAIL_PROVIDER=mock`, `APP_PUBLIC_URL=<url du mobile>`, `PUBLIC_API_URL=<url du backend>`. Activer CORS (déjà fait).
3. **Mobile** : `ionic build --prod` puis héberger le dossier `www/` sur **Netlify / Vercel / Firebase Hosting / Cloudflare Pages** (glisser-déposer `www/` suffit sur Netlify). Avant le build, mettre `src/environments/environment.prod.ts` → `apiBaseUrl: 'https://<backend>/api'`.
4. Partager l'URL du site. Les testeurs créent une famille (essai gratuit) et testent. En `PAYMENT_PROVIDER=mock`, les paiements sont simulés (aucun argent réel).

> Démo ultra-rapide sans rien déployer : exposer ton localhost via un tunnel (`cloudflared tunnel --url http://localhost:3000` pour l'API + `... http://localhost:4200` pour le mobile), mettre l'URL API du tunnel dans `environment.ts`, rebuild, partager l'URL du tunnel mobile. Pratique 1-2h, pas pour du durable.

### Option B — Android (.apk à installer)
Pour tester l'app native sur des téléphones Android :
```powershell
cd C:\Dev\M-FACAM\mobile
ionic build --prod
npx cap add android      # une seule fois
npx cap sync android
npx cap open android     # Android Studio → Build → Build APK(s)
```
Récupérer le fichier `app-debug.apk` et l'envoyer aux testeurs (ils activent « sources inconnues » pour l'installer). L'app pointera vers l'`apiBaseUrl` de `environment.prod.ts` → le backend doit être accessible publiquement (option A étape 1-2).

### Option C — Pistes de test officielles
- **Android** : Google Play Console → **test interne** (jusqu'à 100 testeurs par email, installation via le Play Store).
- **iOS** : **TestFlight** (nécessite un Mac + compte Apple Developer à 99 $/an).

---

## 2. Mise en production

### Backend + base
Voir `deployment.md`. En résumé : PostgreSQL managé (sauvegardes + PITR), backend en conteneur (2+ replicas) derrière HTTPS, secrets via coffre-fort, `JWT_SECRET` régénéré. Le user PostgreSQL doit avoir `CREATEDB` et `facam_template` doit être `IS_TEMPLATE = true` (clonage des bases familles).

### Mobile
- `apiBaseUrl` = URL de prod du backend.
- `PAYMENT_PROVIDER=paypal`, `EMAIL_PROVIDER=smtp` côté backend (voir §4 et `paypal.md`).

---

## 3. Distribuer l'application

| Cible | Comment |
| --- | --- |
| **Web / PWA** | Héberger `www/` (Netlify/Vercel/Firebase). Installable « Ajouter à l'écran d'accueil ». Mises à jour instantanées, aucune validation de store. |
| **Android** | Android Studio → *Generate Signed Bundle* (AAB) → **Google Play Console** (compte dev 25 $ une fois). Délai de revue ~quelques jours. |
| **iOS** | Xcode (sur Mac) → *Archive* → *Distribute* → **App Store Connect** (compte Apple Developer 99 $/an). |

Étapes Capacitor communes :
```powershell
ionic build --prod
npx cap sync            # android + ios
npx cap open android    # ou ios
```
Pense aux icônes/splash (`@capacitor/assets`), au nom et à l'`appId` (déjà `com.familycash.app` dans `capacitor.config.ts`).

> Conseil : commence par la **PWA web** (zéro friction, pas de store), ajoute Android ensuite, iOS en dernier (le plus coûteux).

---

## 4. Brancher PayPal (passer du mock au réel)

Aujourd'hui `PAYMENT_PROVIDER=mock` : tout marche en simulation. Pour le réel :

1. **Comptes & clés** (voir `paypal.md` §1-5) : créer une app PayPal (sandbox d'abord, puis live), récupérer `CLIENT_ID`/`SECRET`, créer le **plan d'abonnement** (Product + Plan 10 €/an → `PAYPAL_SUBSCRIPTION_PLAN_ID`), configurer le **webhook** (→ `PAYPAL_WEBHOOK_ID`).
2. **Variables d'env backend** :
   ```dotenv
   PAYMENT_PROVIDER=paypal
   PAYPAL_MODE=sandbox        # puis "live"
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_SUBSCRIPTION_PLAN_ID=...
   PAYPAL_WEBHOOK_ID=...
   ```
3. **Câbler les vrais appels** dans `backend/src/paypal/paypal.service.ts` (actuellement des stubs) :
   - `createOrder` → `POST /v2/checkout/orders` (cotisations)
   - `capture` → `POST /v2/checkout/orders/{id}/capture`
   - `payout` → `POST /v1/payments/payouts` (versement au responsable d'évènement)
   - abonnement → créer une *subscription* sur le plan
   Le SDK `@paypal/paypal-server-sdk` est déjà en dépendance ; **aucune autre partie du code ne change** (toute l'app passe par l'interface `PaymentProvider`).
4. **Webhook** `POST /api/paypal/webhook` (déjà exposé) : vérifier la signature, puis router les évènements vers :
   - `CHECKOUT.ORDER.APPROVED` / `PAYMENT.CAPTURE.COMPLETED` → `ContributionsService.confirmContribution`
   - `BILLING.SUBSCRIPTION.ACTIVATED` → `SubscriptionsService.confirmPayment`
   - `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` → marquer le payout de l'évènement
5. **Tester en sandbox** (acheteur de test) un cycle complet : cotisation → capture → solde mis à jour ; abonnement → famille `active`.
6. **Passer en live** : `PAYPAL_MODE=live` + clés live + webhook live, et un test à 1 €.

> Idem pour l'email : `EMAIL_PROVIDER=smtp` + brancher nodemailer dans `email.service.ts` (identifiant, vérification, rappels d'abonnement partent alors réellement).
