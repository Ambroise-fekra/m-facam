-- New event type "external" (= hors solidarité commune) :
--   - voted like any event ; at closure the total goes to the responsible.
--   - members contribute SPECIFICALLY via earmarked "external_contributions"
--     (they do NOT touch their share in the caisse familiale).
-- Plus a generic improvement on every non-loan event :
--   - target_amount becomes optional (some events don't have a fixed goal).
--   - new suggested_per_member: indicative amount to contribute per member.

-- 1) Add 'external' to events.type CHECK constraint.
--    Idempotent: only drop+re-add if the current constraint does not already
--    contain 'external'.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'events'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%wedding%'
     AND pg_get_constraintdef(oid) NOT ILIKE '%external%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE events DROP CONSTRAINT %I', c);
    ALTER TABLE events ADD CONSTRAINT events_type_check
      CHECK (type IN ('wedding','death','project','birthday','other','loan','external'));
  END IF;
END $$;

-- 2) target_amount becomes nullable. The original CHECK (target_amount > 0)
--    accepts NULL automatically (NULL > 0 is UNKNOWN, not false).
ALTER TABLE events ALTER COLUMN target_amount DROP NOT NULL;

-- 3) suggested_per_member (optional, indicative).
ALTER TABLE events ADD COLUMN IF NOT EXISTS suggested_per_member numeric(12, 2);

-- 4) Earmarked contributions to an external event (do NOT flow through the
--    member's share, do NOT count in totalCash). At settle, the admin records
--    the actual hand-over to the responsible like for any other event.
CREATE TABLE IF NOT EXISTS external_contributions (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid           NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id    uuid           NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  amount       numeric(12, 2) NOT NULL CHECK (amount > 0),
  method       varchar(16),
  note         varchar(255),
  recorded_by  uuid           REFERENCES members(id) ON DELETE SET NULL,
  created_at   timestamptz    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_external_contributions_event  ON external_contributions(event_id);
CREATE INDEX IF NOT EXISTS idx_external_contributions_member ON external_contributions(member_id);
