-- Add email tracking columns to document_assignments
-- Run with: wrangler d1 execute hartzell_hr_prod --remote --file=./migrations/008_add_email_tracking_columns.sql

-- Add columns to track when reminder and overdue emails were last sent
ALTER TABLE document_assignments ADD COLUMN last_reminder_sent TIMESTAMP;
ALTER TABLE document_assignments ADD COLUMN last_overdue_sent TIMESTAMP;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_assignments_last_reminder ON document_assignments(last_reminder_sent);
CREATE INDEX IF NOT EXISTS idx_assignments_last_overdue ON document_assignments(last_overdue_sent);
