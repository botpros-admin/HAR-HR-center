-- Multi-Signer Document Support
-- Run with: wrangler d1 execute hartzell_hr_prod --remote --file=./migrations/006_multi_signer_support.sql

-- Add multi-signer workflow columns to document_assignments
ALTER TABLE document_assignments ADD COLUMN signing_workflow TEXT; -- JSON: signer configuration
ALTER TABLE document_assignments ADD COLUMN current_signer_step INTEGER DEFAULT 1;
ALTER TABLE document_assignments ADD COLUMN is_multi_signer BOOLEAN DEFAULT 0;

-- Document Signers (tracks each signer in a multi-signer workflow)
CREATE TABLE IF NOT EXISTS document_signers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,  -- Internal employee ID (if from employee_cache)
  bitrix_id INTEGER NOT NULL,    -- Bitrix24 entity ID
  employee_name TEXT NOT NULL,   -- Cached name for display
  employee_email TEXT,           -- Cached email for notifications
  signing_order INTEGER NOT NULL, -- 1, 2, 3...
  role_name TEXT,                -- 'Employee', 'Manager', 'HR Representative', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'signed', 'declined'
  signed_at TIMESTAMP,
  signature_url TEXT,            -- R2 path to signed PDF version
  signature_image_url TEXT,      -- R2 path to signature image (for audit)
  decline_reason TEXT,
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES document_assignments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signers_assignment ON document_signers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_signers_employee ON document_signers(employee_id);
CREATE INDEX IF NOT EXISTS idx_signers_bitrix ON document_signers(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_signers_status ON document_signers(status);
CREATE INDEX IF NOT EXISTS idx_signers_order ON document_signers(assignment_id, signing_order);

-- Add template-level default signer configuration
ALTER TABLE document_templates ADD COLUMN default_signer_config TEXT; -- JSON: default roles and order

-- Update document_assignments trigger to handle updated_at
DROP TRIGGER IF EXISTS update_assignment_timestamp;
CREATE TRIGGER IF NOT EXISTS update_assignment_timestamp
AFTER UPDATE ON document_assignments
BEGIN
  UPDATE document_assignments
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- Trigger to update document_signers timestamp
CREATE TRIGGER IF NOT EXISTS update_signer_timestamp
AFTER UPDATE ON document_signers
BEGIN
  UPDATE document_signers
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- View for pending signers (who needs to sign next)
CREATE VIEW IF NOT EXISTS pending_signers AS
SELECT
  ds.*,
  da.template_id,
  dt.title as document_title,
  da.priority,
  da.due_date,
  da.status as assignment_status
FROM document_signers ds
JOIN document_assignments da ON ds.assignment_id = da.id
JOIN document_templates dt ON da.template_id = dt.id
WHERE ds.status = 'pending'
  AND da.status IN ('assigned', 'sent')
ORDER BY
  CASE da.priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  ds.signing_order ASC;

-- View for multi-signer assignment progress
CREATE VIEW IF NOT EXISTS multi_signer_progress AS
SELECT
  da.id as assignment_id,
  da.template_id,
  dt.title as document_title,
  da.status as assignment_status,
  da.current_signer_step,
  da.priority,
  da.due_date,
  COUNT(ds.id) as total_signers,
  SUM(CASE WHEN ds.status = 'signed' THEN 1 ELSE 0 END) as signed_count,
  SUM(CASE WHEN ds.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN ds.status = 'declined' THEN 1 ELSE 0 END) as declined_count,
  da.created_at,
  da.updated_at
FROM document_assignments da
JOIN document_templates dt ON da.template_id = dt.id
LEFT JOIN document_signers ds ON da.id = ds.assignment_id
WHERE da.is_multi_signer = 1
GROUP BY da.id;

-- Insert system config for multi-signer settings
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
  ('multi_signer_enabled', 'true', 'Enable multi-signer document workflows'),
  ('max_signers_per_document', '4', 'Maximum number of signers per document'),
  ('signer_notification_enabled', 'false', 'Send email notifications to signers (requires email system)');
