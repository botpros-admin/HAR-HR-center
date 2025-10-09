-- Document Management System
-- Run with: wrangler d1 execute hartzell_hr --remote --file=./migrations/003_document_system.sql

-- Document Templates (uploaded by HR admins)
CREATE TABLE IF NOT EXISTS document_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'onboarding', 'tax', 'benefits', 'policy', 'other'
  template_url TEXT NOT NULL, -- R2 URL or path
  file_name TEXT NOT NULL,
  file_size INTEGER,
  requires_signature BOOLEAN DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_by INTEGER, -- admin employee_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON document_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_created ON document_templates(created_at);

-- Document Assignments (which employees need to sign which docs)
CREATE TABLE IF NOT EXISTS document_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  employee_id INTEGER NOT NULL,
  bitrix_id INTEGER NOT NULL,
  signature_request_id TEXT, -- Links to signature_requests table
  status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'sent', 'signed', 'declined', 'expired'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
  due_date TIMESTAMP,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER, -- admin employee_id
  signed_at TIMESTAMP,
  signed_document_url TEXT, -- R2 URL to signed PDF
  bitrix_file_id TEXT, -- Bitrix24 file attachment ID
  notes TEXT,
  FOREIGN KEY (template_id) REFERENCES document_templates(id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_employee ON document_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_bitrix ON document_assignments(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_assignments_template ON document_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON document_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_signature ON document_assignments(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON document_assignments(due_date);

-- Update signature_requests to link to assignments
-- ALTER TABLE signature_requests ADD COLUMN assignment_id INTEGER;

-- Audit trail for document operations
CREATE TABLE IF NOT EXISTS document_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_type TEXT NOT NULL, -- 'template', 'assignment'
  document_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'assigned', 'signed', 'downloaded'
  performed_by INTEGER,
  bitrix_id INTEGER,
  ip_address TEXT,
  metadata TEXT, -- JSON
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_audit_type ON document_audit(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_audit_action ON document_audit(action);
CREATE INDEX IF NOT EXISTS idx_doc_audit_timestamp ON document_audit(timestamp);

-- Views for common queries
CREATE VIEW IF NOT EXISTS pending_document_assignments AS
SELECT
  da.*,
  dt.title as template_title,
  dt.category as template_category,
  dt.requires_signature,
  ec.full_name as employee_name,
  ec.email as employee_email,
  ec.badge_number
FROM document_assignments da
JOIN document_templates dt ON da.template_id = dt.id
LEFT JOIN employee_cache ec ON da.bitrix_id = ec.bitrix_id
WHERE da.status IN ('assigned', 'sent')
  AND (da.due_date IS NULL OR da.due_date > datetime('now'))
ORDER BY
  CASE da.priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  da.due_date ASC;

CREATE VIEW IF NOT EXISTS overdue_assignments AS
SELECT
  da.*,
  dt.title as template_title,
  ec.full_name as employee_name,
  ec.email as employee_email,
  ec.badge_number
FROM document_assignments da
JOIN document_templates dt ON da.template_id = dt.id
LEFT JOIN employee_cache ec ON da.bitrix_id = ec.bitrix_id
WHERE da.status IN ('assigned', 'sent')
  AND da.due_date IS NOT NULL
  AND da.due_date < datetime('now')
ORDER BY da.due_date ASC;

CREATE VIEW IF NOT EXISTS completed_signatures AS
SELECT
  da.*,
  dt.title as template_title,
  dt.category,
  ec.full_name as employee_name,
  ec.badge_number
FROM document_assignments da
JOIN document_templates dt ON da.template_id = dt.id
LEFT JOIN employee_cache ec ON da.bitrix_id = ec.bitrix_id
WHERE da.status = 'signed'
ORDER BY da.signed_at DESC;

-- Triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS update_assignment_timestamp
AFTER UPDATE ON document_assignments
BEGIN
  UPDATE document_assignments
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_template_timestamp
AFTER UPDATE ON document_templates
BEGIN
  UPDATE document_templates
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- Insert default document categories
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
  ('document_retention_days', '2555', 'Document retention period (7 years)'),
  ('max_upload_size_mb', '25', 'Maximum document upload size in MB'),
  ('allowed_file_types', 'pdf,docx,doc', 'Allowed document file extensions');
