-- Applications table for job applicants
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT UNIQUE NOT NULL,
  bitrix_id INTEGER,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  position TEXT NOT NULL,
  status TEXT DEFAULT 'submitted',  -- submitted, screening, interview, offer, hired, rejected
  resume_url TEXT,
  cover_letter_url TEXT,
  data TEXT,  -- JSON blob of all application data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_bitrix_id ON applications(bitrix_id);
