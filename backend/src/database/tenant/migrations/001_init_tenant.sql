-- Tenant template — replicated for each family as facam_<IDENTIFIER>
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS members (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     varchar(80)  NOT NULL,
  last_name      varchar(80)  NOT NULL,
  email          varchar(160) NOT NULL UNIQUE,
  phone          varchar(32),
  password_hash  varchar(255),
  birth_date     date,
  gender         varchar(1)   CHECK (gender IN ('M', 'F', 'O')),
  role           varchar(16)  NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  paypal_email   varchar(160),
  avatar_color   varchar(16),
  is_active      boolean      NOT NULL DEFAULT true,
  father_id      uuid         REFERENCES members(id) ON DELETE SET NULL,
  mother_id      uuid         REFERENCES members(id) ON DELETE SET NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_members_father ON members(father_id);
CREATE INDEX IF NOT EXISTS idx_members_mother ON members(mother_id);

CREATE TABLE IF NOT EXISTS events (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  type              varchar(16)    NOT NULL
                    CHECK (type IN ('wedding', 'death', 'project', 'birthday', 'other')),
  title             varchar(160)   NOT NULL,
  description       text,
  target_amount     numeric(12, 2) NOT NULL CHECK (target_amount > 0),
  deadline          date           NOT NULL,
  responsible_id    uuid           NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  created_by        uuid           REFERENCES members(id) ON DELETE SET NULL,
  status            varchar(16)    NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'closed', 'cancelled')),
  closed_at         timestamptz,
  payout_paypal_tx  varchar(128),
  created_at        timestamptz    NOT NULL DEFAULT now(),
  updated_at        timestamptz    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_deadline ON events(deadline);
CREATE INDEX IF NOT EXISTS idx_events_status   ON events(status);

CREATE TABLE IF NOT EXISTS contributions (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           uuid           NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  amount              numeric(12, 2) NOT NULL CHECK (amount > 0),
  paypal_tx_id        varchar(128),
  paypal_payer_email  varchar(160),
  status              varchar(16)    NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'failed')),
  created_at          timestamptz    NOT NULL DEFAULT now(),
  completed_at        timestamptz
);
CREATE INDEX IF NOT EXISTS idx_contributions_member ON contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);

CREATE TABLE IF NOT EXISTS allocations (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid           NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id   uuid           NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  created_at  timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT uq_allocation_event_member UNIQUE (event_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_allocations_event ON allocations(event_id);
CREATE INDEX IF NOT EXISTS idx_allocations_member ON allocations(member_id);

CREATE TABLE IF NOT EXISTS notifications (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid          NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type         varchar(32)   NOT NULL,
  title        varchar(160)  NOT NULL,
  body         text          NOT NULL,
  payload_json jsonb,
  read_at      timestamptz,
  created_at   timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_member_read ON notifications(member_id, read_at);
