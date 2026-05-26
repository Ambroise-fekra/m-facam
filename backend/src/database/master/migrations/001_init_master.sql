-- Master database — family directory + subscriptions + routing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS families (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier      varchar(64)   NOT NULL UNIQUE,
  name            varchar(128)  NOT NULL,
  db_name         varchar(96)   NOT NULL UNIQUE,
  admin_email     varchar(160)  NOT NULL,
  paypal_email    varchar(160),
  whatsapp_url    varchar(255),
  status          varchar(16)   NOT NULL DEFAULT 'trial'
                  CHECK (status IN ('trial', 'active', 'expired', 'deleted')),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id               uuid          NOT NULL UNIQUE
                          REFERENCES families(id) ON DELETE CASCADE,
  state                   varchar(16)   NOT NULL DEFAULT 'trial'
                          CHECK (state IN ('trial', 'active', 'past_due', 'cancelled', 'deleted')),
  trial_started_at        timestamptz   NOT NULL,
  trial_ends_at           timestamptz   NOT NULL,
  active_until            timestamptz,
  paypal_subscription_id  varchar(64),
  price_eur               numeric(8, 2) NOT NULL DEFAULT 20,
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON subscriptions(trial_ends_at);
