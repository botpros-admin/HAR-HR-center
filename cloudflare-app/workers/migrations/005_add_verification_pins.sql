-- Email Verification PIN System
-- Stores 6-digit PINs for email verification

CREATE TABLE IF NOT EXISTS verification_pins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  pin TEXT NOT NULL,
  draft_id TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  expires_at INTEGER NOT NULL,
  verified_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (draft_id) REFERENCES incomplete_applications(id) ON DELETE CASCADE
);

-- IP-based rate limiting for PIN sends
CREATE TABLE IF NOT EXISTS pin_rate_limits (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'send' or 'verify'
  created_at INTEGER NOT NULL
);

-- IP blocking for abuse prevention
CREATE TABLE IF NOT EXISTS ip_blocks (
  ip_address TEXT PRIMARY KEY,
  reason TEXT NOT NULL, -- 'too_many_pins', 'failed_verifications', 'spam'
  blocked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  attempt_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_pins(email);
CREATE INDEX IF NOT EXISTS idx_verification_draft ON verification_pins(draft_id);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_pins(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_verified ON verification_pins(verified_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip ON pin_rate_limits(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_email ON pin_rate_limits(email, created_at);

CREATE INDEX IF NOT EXISTS idx_ip_blocks_expires ON ip_blocks(expires_at);
