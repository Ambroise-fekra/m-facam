-- Admin email verification + subscription grace period.
ALTER TABLE families ADD COLUMN IF NOT EXISTS admin_email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE families ADD COLUMN IF NOT EXISTS email_verify_token varchar(64);

-- Grace window: after trial/renewal lapses, the family is deactivated until
-- this date, then permanently deleted if still unpaid.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grace_ends_at timestamptz;
