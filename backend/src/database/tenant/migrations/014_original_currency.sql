-- Devise d'origine sur tous les flux financiers.
--
-- Contexte : la zone BEAC (Congo, Cameroun, etc.) utilise le FCFA (XAF) avec
-- une parité fixe et irrevocable 1 EUR = 655,957 XAF. Les Européens cotisent
-- en EUR via PayPal, les Congolais en FCFA via Mobile Money. Pour eviter
-- les pertes d'arrondi (10 000 FCFA -> 15,24 EUR -> 9 998 FCFA reaffichés),
-- on conserve sur chaque ligne le montant et la devise tels que saisis par
-- l'utilisateur, en plus du montant canonique en EUR utilisé pour les sommes.
--
-- Stockage : `amount` reste en EUR (canonique, sert aux totaux caisse, aux
-- soldes, etc.). `original_amount` + `original_currency` portent la donnée
-- brute pour l'affichage et la reconciliation avec les relevés providers.
--
-- Backfill : pour les lignes existantes, originel = amount EUR.

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS original_amount   numeric(14, 2),
  ADD COLUMN IF NOT EXISTS original_currency varchar(4)
    CHECK (original_currency IS NULL OR original_currency IN ('EUR', 'XAF'));
UPDATE contributions
  SET original_amount = amount, original_currency = 'EUR'
  WHERE original_amount IS NULL;

ALTER TABLE external_contributions
  ADD COLUMN IF NOT EXISTS original_amount   numeric(14, 2),
  ADD COLUMN IF NOT EXISTS original_currency varchar(4)
    CHECK (original_currency IS NULL OR original_currency IN ('EUR', 'XAF'));
UPDATE external_contributions
  SET original_amount = amount, original_currency = 'EUR'
  WHERE original_amount IS NULL;

ALTER TABLE loan_repayments
  ADD COLUMN IF NOT EXISTS original_amount   numeric(14, 2),
  ADD COLUMN IF NOT EXISTS original_currency varchar(4)
    CHECK (original_currency IS NULL OR original_currency IN ('EUR', 'XAF'));
UPDATE loan_repayments
  SET original_amount = amount, original_currency = 'EUR'
  WHERE original_amount IS NULL;

ALTER TABLE allocations
  ADD COLUMN IF NOT EXISTS original_amount   numeric(14, 2),
  ADD COLUMN IF NOT EXISTS original_currency varchar(4)
    CHECK (original_currency IS NULL OR original_currency IN ('EUR', 'XAF'));
UPDATE allocations
  SET original_amount = amount, original_currency = 'EUR'
  WHERE original_amount IS NULL;
