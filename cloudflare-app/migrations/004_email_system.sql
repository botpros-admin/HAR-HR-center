-- Migration: Email System
-- Created: 2025-10-16
-- Description: Adds email notification system with global settings, per-employee preferences, and delivery logs

-- ============================================
-- Global Email Settings (Admin Configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,

  -- Master toggle
  email_enabled INTEGER DEFAULT 1, -- 1 = enabled, 0 = disabled

  -- Feature toggles
  notify_assignments INTEGER DEFAULT 1, -- Send email when document is assigned
  notify_reminders INTEGER DEFAULT 1, -- Send reminder emails
  notify_overdue INTEGER DEFAULT 1, -- Send overdue notifications
  notify_confirmations INTEGER DEFAULT 1, -- Send confirmation when document is signed
  notify_profile_updates INTEGER DEFAULT 0, -- Send notification when profile is updated

  -- Configuration
  reminder_days_before INTEGER DEFAULT 3, -- Days before due date to send reminder

  -- Test mode (for development/testing - emails won't actually send)
  test_mode INTEGER DEFAULT 0, -- 1 = test mode (log but don't send), 0 = production
  test_email TEXT, -- If test_mode=1, send all emails here instead

  -- Metadata
  updated_by INTEGER, -- Admin employee_id who last updated settings
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (email_enabled IN (0, 1)),
  CHECK (notify_assignments IN (0, 1)),
  CHECK (notify_reminders IN (0, 1)),
  CHECK (notify_overdue IN (0, 1)),
  CHECK (notify_confirmations IN (0, 1)),
  CHECK (notify_profile_updates IN (0, 1)),
  CHECK (test_mode IN (0, 1)),
  CHECK (reminder_days_before >= 1 AND reminder_days_before <= 14)
);

-- Insert default settings
INSERT INTO email_settings (id, email_enabled, test_mode)
VALUES (1, 0, 1) -- Start with emails disabled and in test mode for safety
ON CONFLICT(id) DO NOTHING;

-- ============================================
-- Employee Email Preferences (Per-User Configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS email_preferences (
  employee_id INTEGER PRIMARY KEY,

  -- Master toggle (employee can opt-out entirely)
  email_enabled INTEGER DEFAULT 1, -- 1 = receive emails, 0 = no emails

  -- Granular preferences (only apply if email_enabled = 1)
  notify_assignments INTEGER DEFAULT 1,
  notify_reminders INTEGER DEFAULT 1,
  notify_overdue INTEGER DEFAULT 1,
  notify_confirmations INTEGER DEFAULT 1,

  -- Alternative email (if different from Bitrix email)
  alternative_email TEXT, -- Optional: send emails here instead of Bitrix email

  -- Metadata
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (email_enabled IN (0, 1)),
  CHECK (notify_assignments IN (0, 1)),
  CHECK (notify_reminders IN (0, 1)),
  CHECK (notify_overdue IN (0, 1)),
  CHECK (notify_confirmations IN (0, 1)),

  -- Foreign key to employee_cache
  FOREIGN KEY (employee_id) REFERENCES employee_cache(bitrix_id) ON DELETE CASCADE
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_employee ON email_preferences(employee_id);

-- ============================================
-- Email Delivery Log (Audit Trail & Monitoring)
-- ============================================
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Employee context
  employee_id INTEGER, -- NULL for system emails (e.g., admin notifications)

  -- Email details
  email_type TEXT NOT NULL, -- assignment_created, reminder, overdue, etc.
  recipient TEXT NOT NULL, -- Email address where email was sent
  subject TEXT NOT NULL,

  -- Delivery status
  status TEXT NOT NULL, -- sent, failed, bounced, queued
  error_message TEXT, -- If failed, why?

  -- Metadata
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (status IN ('sent', 'failed', 'bounced', 'queued')),

  -- Foreign key
  FOREIGN KEY (employee_id) REFERENCES employee_cache(bitrix_id) ON DELETE SET NULL
);

-- Create indexes for queries
CREATE INDEX IF NOT EXISTS idx_email_log_employee ON email_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(email_type);

-- ============================================
-- Email Queue (For Batch Processing & Rate Limiting)
-- ============================================
CREATE TABLE IF NOT EXISTS email_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Employee context
  employee_id INTEGER,

  -- Email details
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,

  -- Queue management
  status TEXT DEFAULT 'queued', -- queued, processing, sent, failed
  attempts INTEGER DEFAULT 0, -- Retry counter
  max_attempts INTEGER DEFAULT 3,

  -- Scheduling
  scheduled_at TEXT, -- When to send (for scheduled emails)
  process_after TEXT, -- Don't process before this time (for retry backoff)

  -- Metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  error_message TEXT,

  -- Constraints
  CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  CHECK (attempts >= 0),
  CHECK (max_attempts >= 1),

  -- Foreign key
  FOREIGN KEY (employee_id) REFERENCES employee_cache(bitrix_id) ON DELETE CASCADE
);

-- Create indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_process_after ON email_queue(process_after);

-- ============================================
-- Unsubscribe Tokens (For CAN-SPAM Compliance)
-- ============================================
CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
  token TEXT PRIMARY KEY, -- UUID v4 token
  employee_id INTEGER NOT NULL,

  -- Token metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT, -- Tokens expire after 90 days for security
  used_at TEXT, -- When token was used to unsubscribe

  -- Foreign key
  FOREIGN KEY (employee_id) REFERENCES employee_cache(bitrix_id) ON DELETE CASCADE
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_employee ON email_unsubscribe_tokens(employee_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_expires ON email_unsubscribe_tokens(expires_at);

-- ============================================
-- Email Templates (Future: Customizable Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Template identification
  template_key TEXT UNIQUE NOT NULL, -- assignment_created, reminder, etc.
  name TEXT NOT NULL,
  description TEXT,

  -- Template content
  subject_template TEXT NOT NULL, -- Supports {{variables}}
  html_template TEXT NOT NULL,
  text_template TEXT NOT NULL,

  -- Status
  is_active INTEGER DEFAULT 1,

  -- Metadata
  created_by INTEGER, -- Admin who created template
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CHECK (is_active IN (0, 1))
);

-- ============================================
-- Audit Log: Track Email Settings Changes
-- ============================================
-- Add email-related actions to existing audit_logs table
-- (No new table needed - just use existing audit_logs with new action types)
-- New action types:
--   - 'email_settings_updated'
--   - 'email_preferences_updated'
--   - 'email_sent'
--   - 'email_failed'

-- ============================================
-- Migration Complete
-- ============================================
-- Summary:
-- - email_settings: Global admin configuration
-- - email_preferences: Per-employee preferences
-- - email_log: Delivery audit trail
-- - email_queue: Batch processing & retries
-- - email_unsubscribe_tokens: CAN-SPAM compliance
-- - email_templates: Future customizable templates
--
-- Safety features:
-- - Starts with emails disabled (email_enabled=0)
-- - Starts in test mode (test_mode=1)
-- - All timestamps for audit trail
-- - Foreign keys for data integrity
-- - Indexes for performance
-- - Check constraints for data validity
