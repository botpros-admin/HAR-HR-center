-- Migration: Add Missing Tables for Applications and Email System
-- Created: 2025-10-19
-- Run with: wrangler d1 execute hartzell_hr_prod --file=./workers/migrations/001_add_missing_tables.sql

-- ============================================================================
-- APPLICATIONS & INCOMPLETE APPLICATIONS
-- ============================================================================

-- Submitted applications (referenced in routes/applications.ts)
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,                    -- Application ID format: APP-{timestamp}-{random}
  bitrix_id INTEGER UNIQUE,               -- Bitrix24 CRM item ID (after submission)

  -- Applicant info (for quick lookups)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'reviewed', 'interview', 'rejected', 'hired')),

  -- File storage (R2 keys)
  resume_url TEXT,
  cover_letter_url TEXT,

  -- Full form data (compressed JSON, PII redacted in logs)
  form_data TEXT NOT NULL,

  -- Metadata
  source TEXT DEFAULT 'Web Application Form',
  referral TEXT,
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  submitted_at INTEGER NOT NULL,          -- Unix timestamp (milliseconds)
  reviewed_at INTEGER,                    -- Unix timestamp (milliseconds)

  -- Rate limiting helper
  submission_count INTEGER DEFAULT 1      -- Track multiple submissions from same email
);

CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_bitrix ON applications(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_position ON applications(position);
CREATE INDEX IF NOT EXISTS idx_applications_submitted ON applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_applications_phone ON applications(phone);

-- Incomplete/draft applications (for auto-save feature)
CREATE TABLE IF NOT EXISTS incomplete_applications (
  id TEXT PRIMARY KEY,                    -- UUID

  -- Matching keys (for duplicate detection)
  email TEXT NOT NULL,                    -- Primary matching key
  phone TEXT,                             -- Secondary matching key
  first_name TEXT,
  last_name TEXT,
  position TEXT,

  -- Form data (progressive field saves)
  form_data TEXT NOT NULL,                -- JSON blob, updated on each field blur
  completed_fields INTEGER DEFAULT 0,     -- Count of non-empty fields
  current_step INTEGER DEFAULT 1,         -- Which step user is on (1-5)
  last_field_saved TEXT,                  -- Track which field was just saved

  -- Bitrix24 linkage (created on first meaningful save)
  bitrix_item_id INTEGER,                 -- Link to Bitrix24 CRM item
  bitrix_stage TEXT DEFAULT 'DT1054_18:APP_INCOMPLETE',
  bitrix_created INTEGER DEFAULT 0,       -- Boolean: has Bitrix item been created?

  -- Session tracking
  session_id TEXT,                        -- Browser sessionStorage ID
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,                       -- 'mobile', 'tablet', 'desktop'

  -- Verification (for cross-device resume)
  verification_token TEXT UNIQUE,         -- For email verification
  verification_sent_at INTEGER,           -- When email was sent
  verification_attempts INTEGER DEFAULT 0,-- How many times PIN requested
  verified INTEGER DEFAULT 0,             -- 0 = unverified, 1 = verified

  -- Analytics
  time_spent_seconds INTEGER DEFAULT 0,   -- Total time on form
  resume_count INTEGER DEFAULT 0,         -- How many times user resumed
  last_resumed_at INTEGER,                -- Last resume timestamp
  abandonment_step INTEGER,               -- Which step user abandoned at

  -- Timestamps
  created_at INTEGER NOT NULL,
  last_updated INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,            -- Auto-expire after 30 days

  -- Constraints
  UNIQUE(email)                           -- One draft per email
);

CREATE INDEX IF NOT EXISTS idx_incomplete_email ON incomplete_applications(email);
CREATE INDEX IF NOT EXISTS idx_incomplete_phone ON incomplete_applications(phone);
CREATE INDEX IF NOT EXISTS idx_incomplete_token ON incomplete_applications(verification_token);
CREATE INDEX IF NOT EXISTS idx_incomplete_expires ON incomplete_applications(expires_at);
CREATE INDEX IF NOT EXISTS idx_incomplete_bitrix ON incomplete_applications(bitrix_item_id);
CREATE INDEX IF NOT EXISTS idx_incomplete_session ON incomplete_applications(session_id);
CREATE INDEX IF NOT EXISTS idx_incomplete_created ON incomplete_applications(created_at);

-- Composite index for duplicate detection (fast fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_incomplete_fuzzy_match ON incomplete_applications(email, phone, last_name);

-- ============================================================================
-- EMAIL SYSTEM TABLES
-- ============================================================================

-- Global email notification settings (referenced in lib/email.ts)
CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton table (only 1 row)

  -- Global toggles
  email_enabled INTEGER DEFAULT 1,               -- Master switch: 0=off, 1=on

  -- Email type toggles
  notify_assignments INTEGER DEFAULT 1,          -- Document assignment emails
  notify_reminders INTEGER DEFAULT 1,            -- Document due reminders
  notify_overdue INTEGER DEFAULT 1,              -- Overdue document alerts
  notify_confirmations INTEGER DEFAULT 1,        -- Document signed confirmations
  notify_applications INTEGER DEFAULT 1,         -- Application received emails
  notify_incomplete INTEGER DEFAULT 1,           -- Resume incomplete application emails

  -- Reminder settings
  reminder_days_before INTEGER DEFAULT 3,        -- Send reminder X days before due
  reminder_frequency_hours INTEGER DEFAULT 24,   -- How often to send reminders

  -- Rate limits
  max_emails_per_hour INTEGER DEFAULT 100,       -- Global rate limit

  -- SMTP/Provider settings (Resend)
  from_email TEXT DEFAULT 'noreply@hartzell.work',
  from_name TEXT DEFAULT 'Hartzell HR Center',

  -- Audit
  updated_at INTEGER DEFAULT (unixepoch()),
  updated_by TEXT
);

-- Insert default settings if not exists
INSERT OR IGNORE INTO email_settings (id) VALUES (1);

-- Per-employee email preferences (opt-out functionality)
CREATE TABLE IF NOT EXISTS email_preferences (
  employee_id INTEGER PRIMARY KEY,        -- Bitrix24 employee ID

  -- Individual toggles (override global settings)
  email_enabled INTEGER DEFAULT 1,        -- Employee-level master switch
  notify_assignments INTEGER DEFAULT 1,
  notify_reminders INTEGER DEFAULT 1,
  notify_overdue INTEGER DEFAULT 1,
  notify_confirmations INTEGER DEFAULT 1,

  -- Contact preferences
  preferred_email TEXT,                   -- Override default email
  notification_frequency TEXT DEFAULT 'immediate' CHECK(notification_frequency IN ('immediate', 'daily_digest', 'weekly_digest')),

  -- Audit
  updated_at INTEGER DEFAULT (unixepoch()),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_prefs_employee ON email_preferences(employee_id);

-- Email audit log (all sent emails)
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Recipient info
  employee_id INTEGER,                    -- NULL for applicant emails
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  -- Email details
  email_type TEXT NOT NULL,               -- 'assignment_created', 'reminder', 'application_received', etc.
  subject TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'bounced')),
  provider_id TEXT,                       -- Resend email ID
  error_message TEXT,

  -- Metadata
  related_id TEXT,                        -- Application ID, signature request ID, etc.
  metadata TEXT,                          -- JSON with additional data

  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  sent_at INTEGER,
  opened_at INTEGER,                      -- If provider supports open tracking
  clicked_at INTEGER                      -- If provider supports click tracking
);

CREATE INDEX IF NOT EXISTS idx_email_log_employee ON email_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at);
CREATE INDEX IF NOT EXISTS idx_email_log_related ON email_log(related_id);

-- Verification codes for incomplete application resume (6-digit PINs)
CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Matching
  email TEXT NOT NULL,
  application_id TEXT NOT NULL,           -- Links to incomplete_applications.id

  -- Code (hashed for security)
  code_hash TEXT NOT NULL,                -- bcrypt hash of 6-digit PIN

  -- Security
  attempts INTEGER DEFAULT 0,             -- Failed verification attempts
  max_attempts INTEGER DEFAULT 3,         -- Lock after 3 failed attempts
  used INTEGER DEFAULT 0,                 -- Single-use: 0=unused, 1=used

  -- IP tracking (prevent abuse)
  ip_address TEXT NOT NULL,

  -- Expiry
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,            -- 10 minutes from creation
  used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_app ON verification_codes(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_ip ON verification_codes(ip_address);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Application funnel analytics
CREATE VIEW IF NOT EXISTS application_funnel AS
SELECT
  COUNT(*) as total_started,
  SUM(CASE WHEN bitrix_created = 1 THEN 1 ELSE 0 END) as created_bitrix_item,
  SUM(CASE WHEN completed_fields >= 15 THEN 1 ELSE 0 END) as reached_halfway,
  SUM(CASE WHEN current_step >= 3 THEN 1 ELSE 0 END) as reached_step_3,
  SUM(CASE WHEN current_step >= 5 THEN 1 ELSE 0 END) as reached_final_step,
  ROUND(AVG(completed_fields), 1) as avg_fields_completed,
  ROUND(AVG(time_spent_seconds / 60.0), 1) as avg_minutes_spent
FROM incomplete_applications
WHERE created_at > unixepoch('now', '-30 days');

-- Email delivery stats
CREATE VIEW IF NOT EXISTS email_stats AS
SELECT
  email_type,
  COUNT(*) as total_sent,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
  SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened,
  ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
FROM email_log
WHERE created_at > unixepoch('now', '-30 days')
GROUP BY email_type;

-- Recent incomplete applications (for monitoring)
CREATE VIEW IF NOT EXISTS recent_incomplete AS
SELECT
  id,
  email,
  COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') as name,
  position,
  completed_fields,
  current_step,
  bitrix_created,
  datetime(created_at, 'unixepoch') as started_at,
  datetime(last_updated, 'unixepoch') as last_active,
  ROUND((unixepoch() - last_updated) / 3600.0, 1) as hours_since_activity
FROM incomplete_applications
WHERE expires_at > unixepoch()
ORDER BY last_updated DESC
LIMIT 100;

-- ============================================================================
-- CLEANUP TRIGGERS
-- ============================================================================

-- Auto-delete expired incomplete applications
CREATE TRIGGER IF NOT EXISTS cleanup_expired_incomplete
AFTER INSERT ON incomplete_applications
BEGIN
  DELETE FROM incomplete_applications
  WHERE expires_at < unixepoch();
END;

-- Auto-delete expired verification codes
CREATE TRIGGER IF NOT EXISTS cleanup_expired_codes
AFTER INSERT ON verification_codes
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < unixepoch();
END;

-- Auto-delete old email logs (keep 90 days)
CREATE TRIGGER IF NOT EXISTS cleanup_old_emails
AFTER INSERT ON email_log
BEGIN
  DELETE FROM email_log
  WHERE created_at < unixepoch('now', '-90 days');
END;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
