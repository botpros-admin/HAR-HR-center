-- Migration 007: Multi-Admin System with Super Admin
-- Purpose: Support multiple HR admins with Carly as super admin

-- Create HR Admins table
-- Tracks who has admin privileges (role='hr_admin' in sessions)
CREATE TABLE IF NOT EXISTS hr_admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bitrix_id INTEGER NOT NULL UNIQUE,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  is_super_admin BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  promoted_by INTEGER, -- bitrix_id of super admin who promoted them
  promoted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP,
  deactivated_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hr_admins_bitrix ON hr_admins(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_hr_admins_active ON hr_admins(is_active);
CREATE INDEX IF NOT EXISTS idx_hr_admins_super ON hr_admins(is_super_admin);

-- Insert Carly as super admin (assuming Carly Taylor, bitrix_id 6509)
-- Note: This will need to be verified/updated based on actual Bitrix ID
INSERT OR REPLACE INTO hr_admins (bitrix_id, employee_name, employee_email, is_super_admin, is_active, notes)
VALUES (
  6509,
  'Carly Taylor',
  'carly@hartzellpainting.com',
  1,
  1,
  'Original super admin - can promote/demote other admins'
);

-- Create admin activity log for audit trail
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_bitrix_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'promoted_admin', 'removed_admin', 'created_assignment', 'signed_document', 'edited_template'
  target_bitrix_id INTEGER, -- The person affected by the action
  resource_type TEXT, -- 'admin', 'assignment', 'template', 'document'
  resource_id TEXT, -- ID of the affected resource
  metadata TEXT, -- JSON with additional details
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for admin activity queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_log(admin_bitrix_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON admin_activity_log(target_bitrix_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity_log(action, created_at);

-- View for active admins
CREATE VIEW IF NOT EXISTS active_hr_admins AS
SELECT
  ha.*,
  ec.full_name,
  ec.email,
  ec.badge_number,
  ec.position
FROM hr_admins ha
LEFT JOIN employee_cache ec ON ha.bitrix_id = ec.bitrix_id
WHERE ha.is_active = 1
ORDER BY ha.is_super_admin DESC, ha.created_at ASC;

-- Trigger to update timestamp
CREATE TRIGGER IF NOT EXISTS update_hr_admin_timestamp
AFTER UPDATE ON hr_admins
BEGIN
  UPDATE hr_admins
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- Comments for documentation
-- hr_admins: Tracks who has admin privileges
-- is_super_admin: Only super admin (Carly) can promote/demote other admins
-- is_active: Soft delete for admins (can be reactivated by super admin)
-- promoted_by: Tracks which super admin gave admin privileges
-- admin_activity_log: Complete audit trail for all admin actions
