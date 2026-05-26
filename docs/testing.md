# Procédure de test — M-FACAM

## 1. Pré-requis (une seule fois)

- Node 20+, Docker Desktop, Ionic CLI, NestJS CLI
- Installer les dépendances :

```powershell
cd C:\Dev\M-FACAM
npm install -g @ionic/cli @nestjs/cli
cd backend; npm install
cd ..\mobile;  npm install
```

## 2. Démarrage local

```powershell
cd C:\Dev\M-FACAM
docker compose up -d postgres        # PostgreSQL 16 sur localhost:5544 (cf .env)
cd backend
npm run migrate:master               # facam_master + tables (idempotent)
npm run migrate:template             # facam_template + tables (idempotent)
npm run migrate:tenants              # rejoue les migrations tenant sur toutes les
                                     # bases facam_FAM_* existantes (utile après
                                     # une évolution de schéma)
npm run seed                         # alimente la famille démo FAM-DUPONT-DEMO
npm run start:dev                    # NestJS sur http://localhost:3000/api
```

Dans un second terminal :

```powershell
cd C:\Dev\M-FACAM\mobile
ionic serve                          # http://localhost:8100
```

## 3. Données de test (créées par `npm run seed`)

| Élément | Valeur |
| --- | --- |
| Identifiant famille | `FAM-DUPONT-DEMO` |
| Admin email | `admin@dupont.demo` |
| Admin password | `demo1234` |
| Membres | Jean (admin), Sophie (fille), Paul (père), Marie (mère) |
| Solde Jean | 450 + 300 cotisé · 200 + 150 alloué → **400 €** |
| Évènement *Mariage de Sophie* | objectif 2 400 €, collecté 850 € |
| Évènement *Construction maison* | objectif 5 000 €, collecté 450 € |
| Liens filiation | Jean ← père Paul + mère Marie ; Sophie ← père Jean |
| Abonnement | Essai 30 jours en cours |

Pour rejouer le seed (efface puis recrée la base `facam_FAM_DUPONT_DEMO`) :

```powershell
cd C:\Dev\M-FACAM\backend
npm run seed
```

## 4. Test via l'app mobile

1. Ouvrir http://localhost:8100
2. Login : `FAM-DUPONT-DEMO` / `admin@dupont.demo` / `demo1234`
3. Tableau de bord : solde, caisse familiale, évènements actifs
4. Cotiser → ouvre la **page de paiement simulée** (mode `mock`, voir §4bis) → « Payer » → le solde s'actualise au retour
5. Évènements → ouvrir « Mariage de Sophie » → bouton **Confirmer l'allocation**
6. Famille → bouton **Ajouter un membre** (admin uniquement)
7. Notifications → marque la notification comme lue
8. Administration → modifier email PayPal famille

## 4bis. Mode démo sans PayPal (PAYMENT_PROVIDER=mock)

Par défaut, `backend\.env` contient `PAYMENT_PROVIDER=mock`. Dans ce mode, aucun
compte PayPal, aucune clé, aucun `ngrok` ne sont nécessaires :

1. « Cotiser » ou « Convertir l'abonnement » ouvre une **fausse page de paiement**
   servie par l'API : `GET /api/payments/mock/checkout`.
2. La page affiche le montant avec deux boutons **Payer** / **Annuler**.
3. « Payer » déclenche exactement les mêmes effets qu'un webhook PayPal réel :
   - cotisation → passe en `completed`, le solde augmente, les autres membres reçoivent une notification ;
   - abonnement → l'abonnement passe `active`, la famille passe `active`.
4. Les **versements** aux responsables (clôture d'évènement) réussissent
   automatiquement et sont tracés dans les logs (`MOCK-PAYOUT-...`).

Pour basculer en vrai PayPal plus tard : mettre `PAYMENT_PROVIDER=paypal` dans
`backend\.env`, renseigner les clés et finir le câblage (voir [paypal.md](paypal.md)).
Les endpoints `mock` sont automatiquement **désactivés** dès que `PAYMENT_PROVIDER`
n'est pas `mock`.

## 5. Test via l'API (sans mobile)

```powershell
$body = '{"identifier":"FAM-DUPONT-DEMO","email":"admin@dupont.demo","password":"demo1234"}'
$res  = Invoke-RestMethod -Method POST -Uri http://localhost:3000/api/auth/login -ContentType 'application/json' -Body $body
$token = $res.token
$h = @{ Authorization = "Bearer $token" }

Invoke-RestMethod -Uri http://localhost:3000/api/contributions/me/balance -Headers $h
Invoke-RestMethod -Uri http://localhost:3000/api/events                    -Headers $h
Invoke-RestMethod -Uri http://localhost:3000/api/transactions/me           -Headers $h
Invoke-RestMethod -Uri http://localhost:3000/api/genealogy/tree            -Headers $h
```

La spec Swagger interactive est sur **http://localhost:3000/api/docs**.

## 6. Réinitialiser tout l'environnement

```powershell
cd C:\Dev\M-FACAM
docker compose down -v               # supprime PostgreSQL + volumes (toutes les bases)
docker compose up -d postgres
cd backend; npm run migrate:master; npm run migrate:template; npm run seed
```

## 6bis. Scénarios fonctionnels à dérouler

### Chef de famille
1. Famille → admin clique **« Désigner »** dans la carte « Chef de famille » → choisir un membre actif.
2. Dashboard : la carte « 👑 Admin · ⭐ Chef de famille » affiche les deux noms + téléphones cliquables.

### Photo (avatar / logo) avec recadrage
1. Famille → tap sur un avatar → **« Recadrer la photo actuelle »** OU **« Choisir une nouvelle photo »**.
2. Glisser/zoomer dans le rond → **Valider**.

### Déclarer sa descendance (sans passer par l'admin)
1. Profil → section **« 👶 Ma descendance »** → ajouter un enfant (prénom + nom + sexe obligatoires).
2. L'enfant apparaît dans Famille avec badge **« 💤 Inactif »**.
3. À sa majorité, admin/chef ajoute son email → clic **« 🔓 Activer la connexion »** → copier / WhatsApp le lien d'invitation.

### Marquer un décès
1. Modifier le profil d'un membre (admin/chef requis) → cocher **« 🕯️ Membre décédé(e) »** → date pré-remplie aujourd'hui.
2. Le membre porte le badge **« 🕯️ Décédé(e) le … »** ; il disparaît de la page Anniversaires et n'est plus compté dans le quorum.

### Évènement classique avec objectif facultatif + suggestion par membre
1. Proposer un évènement → laisser le slider **objectif à 0** (« Pas d'objectif fixé »).
2. Régler le slider **« Suggestion par membre »** sur une valeur (ex. 50 €).
3. Voter → activer → allouer. La suggestion s'affiche sur la fiche pour orienter chaque membre.

### Évènement externe (cagnotte ciblée hors solidarité)
1. Proposer un évènement de type **« 🎁 Évènement externe »**.
2. Une fois actif, n'importe quel membre clique **« Cotiser ciblé »** sur la fiche : choisir un montant + mode (virement/espèces/chèque/PayPal).
3. Vérifier que **la caisse globale du dashboard ne bouge pas** (contrairement à une allocation classique).
4. À l'échéance, admin enregistre la remise au responsable (mode + note).

### Prêt à un membre
1. Proposer un évènement **« 💰 Prêt à un membre »** (le proposant = emprunteur).
2. Vote (l'emprunteur ne peut pas voter ; quorum sur les autres actifs).
3. Activation → la fiche affiche « ⏳ En attente de la remise des fonds » → admin clique **« Marquer comme versé »** avec mode/note → **la caisse baisse du montant du prêt**, l'encart « 💸 Reste à rembourser » apparaît sur le dashboard.
4. L'emprunteur ouvre la fiche → **« ↩️ Enregistrer un remboursement »** → la caisse remonte progressivement.
5. À 100 % remboursé → clôture auto + déblocage auto si jamais bloqué.

### Vote — affichage clair
1. Sur un évènement *proposé*, vérifier que la fiche affiche :
   - **Quorum** : `voters / quorumNeeded (2/3 des N membres actifs)` ✅/❌
   - **Majorité** : `yes / majorityNeeded OUI (2/3 des votants)` ✅/❌
   - **État** : *Adopté* / *En attente* / *Aucun vote*

## 7. Tests automatisés

Tests unitaires Jest (scaffolding livré, à compléter) :

```powershell
cd backend; npm test
```

E2E à venir — voir `backend/test/jest-e2e.json` une fois écrits.
