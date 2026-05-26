# Configuration PayPal — M-FACAM

PayPal est utilisé pour trois flux :

1. **Cotisations** des membres dans la caisse (Orders v2 + Capture)
2. **Versements** au responsable d'un évènement à sa clôture (Payouts)
3. **Abonnement** annuel 20 €/an de la famille (Subscriptions)

Le code livré dans `backend/src/paypal/paypal.service.ts` est un **stub** — il retourne des URLs placeholder. Il faut le câbler avec un vrai compte PayPal Business.

## 1. Créer les comptes PayPal Developer (sandbox)

1. Aller sur https://developer.paypal.com → *Log in* avec un compte PayPal.
2. *Apps & Credentials* → *Sandbox* → *Create App*
   - Nom : `FACAM Sandbox`
   - Type : *Merchant*
3. Récupérer :
   - `Client ID`
   - `Secret`
4. *Sandbox / Accounts* → crée automatiquement deux comptes test (un business + un personnel). Note les emails et mots de passe : ce sont eux qui paieront pendant les tests.

## 2. Activer les fonctionnalités

Dans la fiche de l'app sandbox, cocher au minimum :

- ✅ Accept payments → **Orders v2** (cotisations)
- ✅ Payouts → **Pay multiple parties** (versements aux responsables)
- ✅ Subscriptions → **Recurring billing** (abonnement annuel)

## 3. Renseigner les variables d'environnement

Éditer `C:\Dev\M-FACAM\backend\.env` (créer à partir de `.env.example`) :

```dotenv
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=<Client ID>
PAYPAL_CLIENT_SECRET=<Secret>
PAYPAL_SUBSCRIPTION_EMAIL=facam-billing@paypal.example
SUBSCRIPTION_PRICE_EUR=20
```

Redémarrer `npm run start:dev`.

## 4. Créer le plan d'abonnement (une seule fois)

PayPal exige un *Product* + un *Plan* pour les Subscriptions. Le plus simple :

```bash
# Récupérer un access token
curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -H "Accept: application/json" -H "Accept-Language: en_US" \
  -d "grant_type=client_credentials" | jq .access_token

# Créer le produit
curl -s -X POST https://api-m.sandbox.paypal.com/v1/catalogs/products \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Family Cash Management",
    "description": "Abonnement annuel par famille",
    "type": "SERVICE",
    "category": "SOFTWARE"
  }'

# Créer le plan annuel 20€
curl -s -X POST https://api-m.sandbox.paypal.com/v1/billing/plans \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{
    "product_id": "<PRODUCT_ID>",
    "name": "FACAM Annuel",
    "billing_cycles": [{
      "frequency": { "interval_unit": "YEAR", "interval_count": 1 },
      "tenure_type": "REGULAR",
      "sequence": 1,
      "total_cycles": 0,
      "pricing_scheme": { "fixed_price": { "value": "10", "currency_code": "EUR" } }
    }],
    "payment_preferences": { "auto_bill_outstanding": true }
  }'
```

Stocker l'`id` du plan retourné dans `.env` :

```dotenv
PAYPAL_SUBSCRIPTION_PLAN_ID=P-XXXXXXXXXXXX
```

## 5. Configurer le webhook

C'est par le webhook que les contributions, abonnements et payouts sont confirmés côté serveur.

1. *Apps & Credentials* → ton app sandbox → *Webhooks* → *Add Webhook*
2. URL : `https://<ton-tunnel>/api/paypal/webhook`
   - En local, utilise `ngrok http 3000` ou *VS Code Port Forwarding* pour exposer ton localhost.
3. Cocher les évènements :
   - `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`, `PAYMENT.PAYOUTS-ITEM.FAILED`
4. Récupérer le `Webhook ID` :
   ```dotenv
   PAYPAL_WEBHOOK_ID=WH-XXXXXXXXXXXX
   ```

## 6. Implémenter le câblage réel (à finir dans `paypal.service.ts`)

Le scaffolding contient déjà les méthodes `createOrder`, `capture`, `payout`. Il reste à :

1. Installer le SDK officiel (déjà dans `package.json`) : `@paypal/paypal-server-sdk`.
2. Remplacer les `TODO` par des appels réels (`/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`, `/v1/payments/payouts`).
3. Dans `paypal.controller.ts` (`POST /api/paypal/webhook`), avant de dispatcher :
   - Vérifier la signature avec `/v1/notifications/verify-webhook-signature` en utilisant `PAYPAL_WEBHOOK_ID` et les headers `PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-TRANSMISSION-TIME`.
4. Brancher les évènements :
   - `CHECKOUT.ORDER.APPROVED` → `ContributionsService.confirmContribution`
   - `BILLING.SUBSCRIPTION.ACTIVATED` → `SubscriptionsService.confirmPayment`
   - `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` → mettre à jour `events.payout_paypal_tx`

## 7. Tester un paiement de bout en bout

1. Lancer `ngrok http 3000` (note l'URL HTTPS publique).
2. Mettre à jour l'URL du webhook PayPal avec cette URL.
3. Depuis l'app mobile, démarrer une cotisation.
4. Sur la page PayPal sandbox, se connecter avec l'**acheteur test** (Sandbox Accounts).
5. Valider → PayPal POST sur ton webhook → la contribution passe en `completed` → le solde s'actualise.

## 8. Passage en production (live)

1. Sur https://developer.paypal.com → *Live* → *Create App* (même opérations qu'en sandbox).
2. Remplir un *Profile Business* pour valider l'usage des Payouts (KYC).
3. Mettre à jour `.env` :
   ```dotenv
   PAYPAL_MODE=live
   PAYPAL_CLIENT_ID=<Live Client ID>
   PAYPAL_CLIENT_SECRET=<Live Secret>
   PAYPAL_SUBSCRIPTION_PLAN_ID=<Live Plan ID>
   PAYPAL_WEBHOOK_ID=<Live Webhook ID>
   ```
4. Webhook live → `https://api.familycash.example/api/paypal/webhook`.
5. Test avec un petit montant réel (1 €).
