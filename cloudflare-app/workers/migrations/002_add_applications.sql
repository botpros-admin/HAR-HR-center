-- Part 2: Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  bitrix_id INTEGER UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'reviewed', 'interview', 'rejected', 'hired')),
  resume_url TEXT,
  cover_letter_url TEXT,
  form_data TEXT NOT NULL,
  source TEXT DEFAULT 'Web Application Form',
  referral TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  submitted_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  submission_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_bitrix ON applications(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_position ON applications(position);
CREATE INDEX IF NOT EXISTS idx_applications_submitted ON applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_applications_phone ON applications(phone);
