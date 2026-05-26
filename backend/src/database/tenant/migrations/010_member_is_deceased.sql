-- Separate "deceased" flag from "deceased_at" date so we can mark an ancestor
-- as deceased even when the exact date is unknown.
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_deceased boolean NOT NULL DEFAULT false;

-- Backfill: any member that already has a date is_deceased by definition.
UPDATE members SET is_deceased = true
 WHERE deceased_at IS NOT NULL AND is_deceased = false;
