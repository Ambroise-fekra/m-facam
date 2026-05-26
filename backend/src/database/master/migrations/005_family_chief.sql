-- Designate one active family member as "chef de famille" (in addition to the
-- admin who manages the app). Stored in master because it's family-level info
-- shown on every screen; no FK to the tenant DB (cross-DB), the app validates.
ALTER TABLE families ADD COLUMN IF NOT EXISTS chief_member_id uuid;
