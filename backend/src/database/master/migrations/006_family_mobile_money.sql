-- Mobile Money account of the family (in addition to PayPal). Lets families
-- with members in different regions accept both channels simultaneously.
ALTER TABLE families ADD COLUMN IF NOT EXISTS mobile_money_number   varchar(32);
ALTER TABLE families ADD COLUMN IF NOT EXISTS mobile_money_operator varchar(16);
