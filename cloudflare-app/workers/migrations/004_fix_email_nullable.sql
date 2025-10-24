-- Fix: Make email column nullable
-- Recreate table without NOT NULL constraint on email

-- Step 1: Create new table with correct schema
CREATE TABLE IF NOT EXISTS incomplete_applications_new (
  id TEXT PRIMARY KEY,
  email TEXT,  -- Changed: removed NOT NULL
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  form_data TEXT NOT NULL,
  completed_fields INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 1,
  last_field_saved TEXT,
  bitrix_item_id INTEGER,
  bitrix_stage TEXT DEFAULT 'DT1054_18:APP_INCOMPLETE',
  bitrix_created INTEGER DEFAULT 0,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  verification_token TEXT UNIQUE,
  verification_sent_at INTEGER,
  verification_attempts INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  resume_count INTEGER DEFAULT 0,
  last_resumed_at INTEGER,
  abandonment_step INTEGER,
  created_at INTEGER NOT NULL,
  last_updated INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  UNIQUE(email)
);

-- Step 2: Copy all existing data (if any)
INSERT INTO incomplete_applications_new
SELECT * FROM incomplete_applications;

-- Step 3: Drop old table
DROP TABLE incomplete_applications;

-- Step 4: Rename new table
ALTER TABLE incomplete_applications_new RENAME TO incomplete_applications;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_incomplete_email ON incomplete_applications(email);
CREATE INDEX IF NOT EXISTS idx_incomplete_phone ON incomplete_applications(phone);
CREATE INDEX IF NOT EXISTS idx_incomplete_token ON incomplete_applications(verification_token);
CREATE INDEX IF NOT EXISTS idx_incomplete_expires ON incomplete_applications(expires_at);
CREATE INDEX IF NOT EXISTS idx_incomplete_bitrix ON incomplete_applications(bitrix_item_id);
CREATE INDEX IF NOT EXISTS idx_incomplete_session ON incomplete_applications(session_id);
CREATE INDEX IF NOT EXISTS idx_incomplete_created ON incomplete_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_incomplete_fuzzy_match ON incomplete_applications(email, phone, last_name);
