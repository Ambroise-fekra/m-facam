-- Member photo (stored as a small resized data URL).
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo text;
