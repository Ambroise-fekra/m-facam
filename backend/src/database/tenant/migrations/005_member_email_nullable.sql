-- Members without an email: e.g. deceased relatives added only for the
-- genealogy tree, who never log in (no email, no phone). The UNIQUE constraint
-- on email stays; PostgreSQL allows multiple NULLs under a UNIQUE index.
-- Idempotent: DROP NOT NULL on an already-nullable column is a no-op.
ALTER TABLE members ALTER COLUMN email DROP NOT NULL;
