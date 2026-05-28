-- Trois additions transversales :
--   1) Surnom du membre (champ libre, non obligatoire) — beaucoup de gens dans
--      la famille sont mieux connus sous leur petit nom.
--   2) Conjoint actuel — relation bidirectionnelle, gérée côté applicatif :
--      quand A déclare B, on positionne spouse_id sur les deux. Un seul
--      conjoint à la fois (la valeur précédente est écrasée si remariage).
--   3) Canal de paiement enregistré sur la cotisation à la caisse familiale,
--      pour aligner avec les contributions aux évènements externes.

ALTER TABLE members ADD COLUMN IF NOT EXISTS nickname    varchar(80);
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_id   uuid REFERENCES members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_members_spouse ON members(spouse_id);

ALTER TABLE contributions ADD COLUMN IF NOT EXISTS channel varchar(16)
  CHECK (channel IS NULL OR channel IN ('paypal', 'mobile_money'));
