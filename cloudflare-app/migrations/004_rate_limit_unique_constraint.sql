-- Add unique constraint for rate limiting atomic operations
-- Run with: wrangler d1 execute hartzell_hr --remote --file=./migrations/004_rate_limit_unique_constraint.sql

-- Create new table with unique constraint
CREATE TABLE IF NOT EXISTS rate_limits_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  attempt_type TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  first_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blocked_until TIMESTAMP,
  UNIQUE(identifier, attempt_type)
);

-- Copy existing data, keeping only the most recent row for each (identifier, attempt_type)
-- This handles any existing duplicates by selecting the row with the max ID (most recent)
INSERT INTO rate_limits_new (id, identifier, attempt_type, attempts, first_attempt, last_attempt, blocked_until)
SELECT id, identifier, attempt_type, attempts, first_attempt, last_attempt, blocked_until
FROM rate_limits rl
WHERE id = (
  SELECT MAX(id)
  FROM rate_limits
  WHERE identifier = rl.identifier AND attempt_type = rl.attempt_type
);

-- Drop old table
DROP TABLE rate_limits;

-- Rename new table
ALTER TABLE rate_limits_new RENAME TO rate_limits;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_ratelimit_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_ratelimit_type ON rate_limits(attempt_type);
CREATE INDEX IF NOT EXISTS idx_ratelimit_blocked ON rate_limits(blocked_until);
