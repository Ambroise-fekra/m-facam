-- Mark a member as deceased (date of death). When set, the app automatically
-- considers the member as inactive (excluded from quorum, etc.). Genealogy
-- and family tree still display them.
ALTER TABLE members ADD COLUMN IF NOT EXISTS deceased_at date;
