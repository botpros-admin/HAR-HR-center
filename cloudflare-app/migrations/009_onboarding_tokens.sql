-- Onboarding Magic Link Token System
-- Run with: wrangler d1 execute hartzell_hr_prod --remote --file=./migrations/009_onboarding_tokens.sql

-- Onboarding Tokens (magic links for secure onboarding portal access)
CREATE TABLE IF NOT EXISTS onboarding_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,           -- 32-char hex token for magic link
  bitrix_id INTEGER NOT NULL,           -- Bitrix24 HR Center item ID
  employee_email TEXT NOT NULL,         -- Employee email for verification
  employee_name TEXT NOT NULL,          -- Employee name for display
  expires_at INTEGER NOT NULL,          -- Unix timestamp (7 days from creation)
  used_at INTEGER DEFAULT NULL,         -- Unix timestamp when token was used
  created_at INTEGER NOT NULL,          -- Unix timestamp of creation
  UNIQUE(bitrix_id)                     -- One active token per employee
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_token ON onboarding_tokens(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_bitrix ON onboarding_tokens(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_expires ON onboarding_tokens(expires_at);

-- Onboarding Data Submissions (track completed onboarding forms)
CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id INTEGER NOT NULL,            -- Reference to onboarding_tokens
  bitrix_id INTEGER NOT NULL,           -- Bitrix24 HR Center item ID
  submission_data TEXT NOT NULL,        -- JSON: all onboarding form data
  ip_address TEXT,                      -- IP address for security audit
  user_agent TEXT,                      -- Browser/device info
  submitted_at INTEGER NOT NULL,        -- Unix timestamp
  synced_to_bitrix_at INTEGER DEFAULT NULL, -- When data was pushed to Bitrix24
  FOREIGN KEY (token_id) REFERENCES onboarding_tokens(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_token ON onboarding_submissions(token_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_bitrix ON onboarding_submissions(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_submitted ON onboarding_submissions(submitted_at);
