-- Per-member Mobile Money coordinates + preferred payment channel.
-- A member can have PayPal AND/OR Mobile Money. The "preferred_channel"
-- (paypal | mobile_money | null) is just a UI default — the member can
-- choose otherwise at any cotisation.
ALTER TABLE members ADD COLUMN IF NOT EXISTS mobile_money_number   varchar(32);
ALTER TABLE members ADD COLUMN IF NOT EXISTS mobile_money_operator varchar(16);
ALTER TABLE members ADD COLUMN IF NOT EXISTS preferred_channel     varchar(16)
  CHECK (preferred_channel IS NULL OR preferred_channel IN ('paypal', 'mobile_money'));
