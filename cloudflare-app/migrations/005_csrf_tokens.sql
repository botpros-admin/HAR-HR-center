-- CSRF tokens table for KV quota fallback
-- When KV write quota is exceeded, CSRF tokens are stored in D1 instead

CREATE TABLE IF NOT EXISTS csrf_tokens (
  session_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_csrf_expires ON csrf_tokens(expires_at);

-- Trigger to clean up expired CSRF tokens
CREATE TRIGGER IF NOT EXISTS cleanup_expired_csrf_tokens
AFTER INSERT ON csrf_tokens
BEGIN
  DELETE FROM csrf_tokens
  WHERE expires_at < datetime('now');
END;
