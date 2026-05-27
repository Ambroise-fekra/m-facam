-- New event type: "loan" (a loan to an active family member).
-- The borrower posts the event, the family votes (borrower excluded), and the
-- admin disburses the funds (reusing the existing payout/settle flow). The
-- borrower repays via dedicated "loan_repayments" records; the caisse total
-- includes the resulting delta (− disbursed + repaid).

-- 1) Extend the events.type CHECK constraint to include 'loan'. The original
--    constraint name may be auto-generated; drop by content match then re-add.
--    Idempotent: skip when 'loan' is already part of an existing CHECK so we
--    don't downgrade a constraint that later migrations have already widened.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'events'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%wedding%'
     AND pg_get_constraintdef(oid) NOT ILIKE '%loan%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE events DROP CONSTRAINT %I', c);
    ALTER TABLE events ADD CONSTRAINT events_type_check
      CHECK (type IN ('wedding','death','project','birthday','other','loan'));
  END IF;
END $$;

-- 2) Borrower (member who took the loan) — required when type='loan'.
ALTER TABLE events ADD COLUMN IF NOT EXISTS borrower_id uuid REFERENCES members(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_events_borrower ON events(borrower_id);

-- 3) Block flag on members (set automatically when a loan goes past due
--    unpaid; blocked members cannot vote, propose events or borrow).
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- 4) Loan repayments — kept separate from regular contributions so they don't
--    affect the borrower's share in the caisse.
CREATE TABLE IF NOT EXISTS loan_repayments (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid           NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id    uuid           NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  amount       numeric(12, 2) NOT NULL CHECK (amount > 0),
  method       varchar(16),
  note         varchar(255),
  recorded_by  uuid           REFERENCES members(id) ON DELETE SET NULL,
  created_at   timestamptz    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_event  ON loan_repayments(event_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_member ON loan_repayments(member_id);
