-- Hartzell HR Center - Cloudflare D1 Database Schema
-- Run with: wrangler d1 execute hartzell_hr --file=./workers/schema.sql

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  bitrix_id INTEGER NOT NULL,
  badge_number TEXT NOT NULL,
  role TEXT NOT NULL, -- 'employee', 'hr_admin'
  data TEXT NOT NULL, -- JSON serialized session data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_employee ON sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_bitrix ON sessions(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_badge ON sessions(badge_number);

-- Audit logs (all authentication and action events)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER,
  bitrix_id INTEGER,
  badge_number TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failure', 'blocked'
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON for additional context
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_employee ON audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_bitrix ON audit_logs(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_audit_badge ON audit_logs(badge_number);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_logs(status);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL, -- badge_number or IP address
  attempt_type TEXT NOT NULL, -- 'login', 'ssn_verify'
  attempts INTEGER DEFAULT 1,
  first_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  blocked_until TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ratelimit_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_ratelimit_type ON rate_limits(attempt_type);
CREATE INDEX IF NOT EXISTS idx_ratelimit_blocked ON rate_limits(blocked_until);

-- Signature request tracking (OpenSign integration)
CREATE TABLE IF NOT EXISTS signature_requests (
  id TEXT PRIMARY KEY, -- OpenSign request ID
  employee_id INTEGER NOT NULL,
  bitrix_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  document_title TEXT,
  status TEXT NOT NULL, -- 'pending', 'signed', 'declined', 'expired'
  opensign_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  signed_at TIMESTAMP,
  expired_at TIMESTAMP,
  metadata TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_signatures_employee ON signature_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_signatures_bitrix ON signature_requests(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_signatures_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signatures_type ON signature_requests(document_type);

-- Pending tasks/actions for employees
CREATE TABLE IF NOT EXISTS pending_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  bitrix_id INTEGER NOT NULL,
  task_type TEXT NOT NULL, -- 'sign_document', 'complete_profile', 'review_benefits'
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL, -- 'high', 'medium', 'low'
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  related_id TEXT, -- e.g., signature_request_id
  metadata TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_employee ON pending_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_bitrix ON pending_tasks(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON pending_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON pending_tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON pending_tasks(priority);

-- Employee data cache (for performance - sync from Bitrix24)
CREATE TABLE IF NOT EXISTS employee_cache (
  bitrix_id INTEGER PRIMARY KEY,
  badge_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  data TEXT NOT NULL, -- Full JSON from Bitrix24
  last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_cache_badge ON employee_cache(badge_number);
CREATE INDEX IF NOT EXISTS idx_cache_sync ON employee_cache(last_sync);
CREATE INDEX IF NOT EXISTS idx_cache_email ON employee_cache(email);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- Insert default configuration
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
  ('max_login_attempts', '5', 'Maximum login attempts before lockout'),
  ('lockout_duration', '900', 'Lockout duration in seconds (15 minutes)'),
  ('session_timeout', '28800', 'Session timeout in seconds (8 hours)'),
  ('require_ssn_for_sensitive', 'true', 'Require last 4 SSN for sensitive actions'),
  ('enable_captcha_after', '3', 'Show CAPTCHA after N failed attempts');

-- Views for common queries
CREATE VIEW IF NOT EXISTS active_sessions AS
SELECT
  s.*,
  ec.full_name,
  ec.position,
  ec.department
FROM sessions s
LEFT JOIN employee_cache ec ON s.bitrix_id = ec.bitrix_id
WHERE s.expires_at > CURRENT_TIMESTAMP
  AND datetime(s.last_activity, '+30 minutes') > CURRENT_TIMESTAMP;

CREATE VIEW IF NOT EXISTS recent_audit_logs AS
SELECT
  al.*,
  ec.full_name,
  ec.position
FROM audit_logs al
LEFT JOIN employee_cache ec ON al.bitrix_id = ec.bitrix_id
ORDER BY al.timestamp DESC
LIMIT 1000;

CREATE VIEW IF NOT EXISTS pending_signatures AS
SELECT
  sr.*,
  ec.full_name,
  ec.email
FROM signature_requests sr
LEFT JOIN employee_cache ec ON sr.bitrix_id = ec.bitrix_id
WHERE sr.status = 'pending'
ORDER BY sr.created_at DESC;

-- Triggers for automatic cleanup
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
AFTER INSERT ON sessions
BEGIN
  DELETE FROM sessions
  WHERE expires_at < datetime('now', '-1 day');
END;

CREATE TRIGGER IF NOT EXISTS cleanup_old_audit_logs
AFTER INSERT ON audit_logs
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < datetime('now', '-90 days');
END;

-- Function to check rate limit (via stored procedure simulation)
-- Note: D1 doesn't support stored procedures, so this is handled in application code

-- Initial data sync trigger would go here
-- But we'll handle syncing in the application code
