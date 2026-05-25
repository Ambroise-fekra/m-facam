-- Invitation token so a member can set their own password from an invite link.
ALTER TABLE members ADD COLUMN IF NOT EXISTS invite_token varchar(64);
CREATE INDEX IF NOT EXISTS idx_members_invite ON members (invite_token);
