-- Family logo/photo (stored as a small resized data URL), set by the admin.
ALTER TABLE families ADD COLUMN IF NOT EXISTS photo text;
