-- Add email verification to applications table
ALTER TABLE applications ADD COLUMN verification_token TEXT;
ALTER TABLE applications ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN verified_at INTEGER;

-- Index for verification token lookups (UNIQUE constraint handled in application code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_verification_unique ON applications(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applications_verified ON applications(email_verified);
