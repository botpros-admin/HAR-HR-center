-- Part 3: Email System Tables (Corrected)
CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email_enabled INTEGER DEFAULT 1,
  notify_assignments INTEGER DEFAULT 1,
  notify_reminders INTEGER DEFAULT 1,
  notify_overdue INTEGER DEFAULT 1,
  notify_confirmations INTEGER DEFAULT 1,
  notify_applications INTEGER DEFAULT 1,
  notify_incomplete INTEGER DEFAULT 1,
  reminder_days_before INTEGER DEFAULT 3,
  reminder_frequency_hours INTEGER DEFAULT 24,
  max_emails_per_hour INTEGER DEFAULT 100,
  from_email TEXT DEFAULT 'noreply@hartzell.work',
  from_name TEXT DEFAULT 'Hartzell HR Center',
  updated_at INTEGER,
  updated_by TEXT
);

INSERT OR IGNORE INTO email_settings (id, updated_at) VALUES (1, cast(unixepoch() as int));

CREATE TABLE IF NOT EXISTS email_preferences (
  employee_id INTEGER PRIMARY KEY,
  email_enabled INTEGER DEFAULT 1,
  notify_assignments INTEGER DEFAULT 1,
  notify_reminders INTEGER DEFAULT 1,
  notify_overdue INTEGER DEFAULT 1,
  notify_confirmations INTEGER DEFAULT 1,
  preferred_email TEXT,
  notification_frequency TEXT DEFAULT 'immediate',
  updated_at INTEGER,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_prefs_employee ON email_preferences(employee_id);

-- email_log already created, just add indexes
CREATE INDEX IF NOT EXISTS idx_email_log_employee ON email_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at);

-- Add remaining columns to email_log
ALTER TABLE email_log ADD COLUMN recipient_name TEXT;
ALTER TABLE email_log ADD COLUMN subject TEXT;
ALTER TABLE email_log ADD COLUMN provider_id TEXT;
ALTER TABLE email_log ADD COLUMN error_message TEXT;
ALTER TABLE email_log ADD COLUMN related_id TEXT;
ALTER TABLE email_log ADD COLUMN metadata TEXT;
ALTER TABLE email_log ADD COLUMN sent_at INTEGER;
ALTER TABLE email_log ADD COLUMN opened_at INTEGER;
ALTER TABLE email_log ADD COLUMN clicked_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_email_log_related ON email_log(related_id);

CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  application_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  used INTEGER DEFAULT 0,
  ip_address TEXT NOT NULL,
  created_at INTEGER,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_app ON verification_codes(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_ip ON verification_codes(ip_address);
