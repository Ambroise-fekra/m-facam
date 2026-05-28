-- Cotisations à la caisse familiale : ajout d'une colonne `method` pour
-- enregistrer le moyen de paiement (transfer/cash/cheque/paypal/mobile_money/
-- other), en complément du `channel` (paypal | mobile_money) qui restait
-- réservé à la cotisation passant par le checkout in-app.
--
-- La colonne est utilisée principalement par l'enregistrement manuel par
-- l'admin (versement en espèces, virement direct etc. à crediter au membre
-- sans passer par PayPal). Pour les cotisations issues du checkout in-app,
-- on positionne method='paypal' au moment de la confirmation.

ALTER TABLE contributions ADD COLUMN IF NOT EXISTS method varchar(16);

-- recorded_by : qui a enregistré la cotisation (admin pour les manuelles,
-- le membre lui-même pour les auto-paiements via checkout). Utile pour
-- afficher "Versement enregistré par X" dans l'historique.
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES members(id) ON DELETE SET NULL;
