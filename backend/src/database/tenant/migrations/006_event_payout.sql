-- Manual payout to the event responsible (replaces the automatic PayPal payout).
-- The admin records how the funds were handed over (transfer/cash/cheque/paypal)
-- and marks the event as settled.
ALTER TABLE events ADD COLUMN IF NOT EXISTS payout_status varchar(16) NOT NULL DEFAULT 'pending';
ALTER TABLE events ADD COLUMN IF NOT EXISTS payout_method varchar(16);
ALTER TABLE events ADD COLUMN IF NOT EXISTS payout_note   varchar(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS payout_at     timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS payout_by     uuid;

-- Events already closed under the old auto-payout were effectively settled.
UPDATE events SET payout_status = 'done'
 WHERE status = 'closed' AND payout_status = 'pending' AND payout_paypal_tx IS NOT NULL;
