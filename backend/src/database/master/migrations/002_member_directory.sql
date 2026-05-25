-- Lightweight directory mapping a member email to its family identifier.
-- Lets a member recover the family identifier by email (like a password reset),
-- without scanning every per-family tenant database.
CREATE TABLE IF NOT EXISTS member_directory (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  email              varchar(160) NOT NULL,
  family_id          uuid         NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  family_identifier  varchar(64)  NOT NULL,
  created_at         timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_member_directory_email ON member_directory (lower(email));
CREATE INDEX IF NOT EXISTS idx_member_directory_family ON member_directory (family_id);
