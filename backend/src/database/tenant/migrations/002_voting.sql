-- Voting workflow + extra event dates (tenant template)

ALTER TABLE events ADD COLUMN IF NOT EXISTS event_date date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS decision_deadline date;
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'proposed';
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('proposed', 'active', 'closed', 'cancelled', 'rejected'));

CREATE TABLE IF NOT EXISTS event_votes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id   uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  value       varchar(3)  NOT NULL CHECK (value IN ('yes', 'no')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_vote_event_member UNIQUE (event_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_event_votes_event  ON event_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_votes_member ON event_votes(member_id);
