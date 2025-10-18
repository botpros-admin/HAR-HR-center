/**
 * Authentication utilities
 */

import type { Env, SessionData, AuditLogEntry, RateLimitResult, BitrixEmployee } from '../types';

/**
 * Check rate limit for login attempts
 * Uses atomic operations to prevent TOCTOU race conditions
 */
export async function checkRateLimit(
  env: Env,
  identifier: string,
  type: 'login' | 'ssn_verify'
): Promise<RateLimitResult> {
  const maxAttempts = parseInt(env.RATE_LIMIT_MAX_ATTEMPTS);
  const window = parseInt(env.RATE_LIMIT_WINDOW);
  const captchaThreshold = 3; // Show CAPTCHA after 3 attempts

  // First, check if already blocked (read-only check is safe)
  const blockedCheck = await env.DB.prepare(`
    SELECT blocked_until
    FROM rate_limits
    WHERE identifier = ? AND attempt_type = ?
      AND blocked_until IS NOT NULL
      AND datetime(blocked_until) > datetime('now')
  `)
    .bind(identifier, type)
    .first<{ blocked_until: string }>();

  if (blockedCheck) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor(new Date(blockedCheck.blocked_until).getTime() / 1000),
      requiresCaptcha: true
    };
  }

  // Atomically increment attempts and get updated value
  // This prevents race conditions by combining check and increment in one operation
  const result = await env.DB.prepare(`
    INSERT INTO rate_limits (identifier, attempt_type, attempts, first_attempt, last_attempt)
    VALUES (?, ?, 1, datetime('now'), datetime('now'))
    ON CONFLICT(identifier, attempt_type) DO UPDATE SET
      attempts = CASE
        WHEN datetime(first_attempt, '+' || ? || ' seconds') <= datetime('now')
        THEN 1  -- Window expired, reset to 1
        ELSE attempts + 1  -- Within window, increment
      END,
      first_attempt = CASE
        WHEN datetime(first_attempt, '+' || ? || ' seconds') <= datetime('now')
        THEN datetime('now')  -- Window expired, reset timestamp
        ELSE first_attempt  -- Keep original timestamp
      END,
      last_attempt = datetime('now')
    RETURNING attempts, first_attempt, blocked_until
  `)
    .bind(identifier, type, window.toString(), window.toString())
    .first<{ attempts: number; first_attempt: string; blocked_until: string | null }>();

  if (!result) {
    // Should never happen, but handle gracefully
    console.error('[checkRateLimit] No result from INSERT/UPDATE RETURNING');
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor((Date.now() + window * 1000) / 1000),
      requiresCaptcha: true
    };
  }

  const currentAttempts = result.attempts;

  // Check if we just exceeded the limit
  if (currentAttempts >= maxAttempts) {
    // Block for the window duration
    const blockedUntil = new Date(Date.now() + window * 1000).toISOString();

    await env.DB.prepare(`
      UPDATE rate_limits
      SET blocked_until = ?
      WHERE identifier = ? AND attempt_type = ?
    `)
      .bind(blockedUntil, identifier, type)
      .run();

    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor(new Date(blockedUntil).getTime() / 1000),
      requiresCaptcha: true
    };
  }

  // Calculate reset time
  const resetAt = Math.floor((new Date(result.first_attempt).getTime() + window * 1000) / 1000);

  return {
    allowed: true,
    remaining: maxAttempts - currentAttempts,
    resetAt,
    requiresCaptcha: currentAttempts >= captchaThreshold
  };
}

export async function resetRateLimit(
  env: Env,
  identifier: string,
  type: 'login' | 'ssn_verify'
): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM rate_limits WHERE identifier = ? AND attempt_type = ?`
  )
    .bind(identifier, type)
    .run();
}

/**
 * Verify Cloudflare Turnstile (CAPTCHA)
 */
export async function verifyCaptcha(
  env: Env,
  token: string,
  ipAddress: string
): Promise<boolean> {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ipAddress
    })
  });

  const data = await response.json<{ success: boolean }>();
  return data.success;
}

/**
 * Create session
 */
export async function createSession(
  env: Env,
  employee: BitrixEmployee,
  ipAddress: string,
  userAgent: string
): Promise<SessionData & { id: string }> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parseInt(env.SESSION_MAX_AGE) * 1000).toISOString();

  const sessionData: SessionData = {
    employeeId: employee.id,
    bitrixId: employee.id,
    badgeNumber: employee.ufCrm6BadgeNumber,
    name: `${employee.ufCrm6Name} ${employee.ufCrm6LastName}`,
    email: employee.ufCrm6Email[0] || '',
    role: determineRole(employee),
    position: employee.ufCrm6WorkPosition,
    department: employee.ufCrm6Subsidiary,
    createdAt: Date.now()
  };

  // Store in D1
  await env.DB.prepare(`
    INSERT INTO sessions (
      id, employee_id, bitrix_id, badge_number, role, data,
      expires_at, ip_address, user_agent
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      sessionId,
      sessionData.employeeId,
      sessionData.bitrixId,
      sessionData.badgeNumber,
      sessionData.role,
      JSON.stringify(sessionData),
      expiresAt,
      ipAddress,
      userAgent
    )
    .run();

  // Cache in KV for faster lookups (non-critical, fail gracefully)
  try {
    await env.CACHE.put(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      { expirationTtl: parseInt(env.SESSION_MAX_AGE) }
    );
  } catch (error) {
    // KV quota exceeded or error - ignore and continue (D1 has the data)
    console.warn('KV cache write failed (quota exceeded?):', error);
  }

  return { ...sessionData, id: sessionId };
}

/**
 * Verify session
 */
export async function verifySession(
  env: Env,
  sessionId: string
): Promise<SessionData | null> {
  // Try KV first (faster)
  const cached = await env.CACHE.get(`session:${sessionId}`);
  if (cached) {
    // Update last activity (await to prevent dropped updates under load)
    await env.DB.prepare(`
      UPDATE sessions
      SET last_activity = datetime('now')
      WHERE id = ?
    `)
      .bind(sessionId)
      .run();

    return JSON.parse(cached);
  }

  // Fallback to D1
  const result = await env.DB.prepare(`
    SELECT data FROM sessions
    WHERE id = ?
      AND expires_at > datetime('now')
      AND datetime(last_activity, '+30 minutes') > datetime('now')
  `)
    .bind(sessionId)
    .first<{ data: string }>();

  if (!result) {
    return null;
  }

  const sessionData = JSON.parse(result.data) as SessionData;

  // Update last activity
  await env.DB.prepare(`
    UPDATE sessions
    SET last_activity = datetime('now')
    WHERE id = ?
  `)
    .bind(sessionId)
    .run();

  // Refresh KV cache (non-critical, fail gracefully)
  try {
    await env.CACHE.put(
      `session:${sessionId}`,
      result.data,
      { expirationTtl: parseInt(env.SESSION_MAX_AGE) }
    );
  } catch (error) {
    // KV quota exceeded or error - ignore and continue
    console.warn('KV cache refresh failed (quota exceeded?):', error);
  }

  return sessionData;
}

/**
 * Audit log
 */
export async function auditLog(
  env: Env,
  entry: AuditLogEntry
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO audit_logs (
      employee_id, bitrix_id, badge_number, action, status,
      ip_address, user_agent, metadata, timestamp
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)
    .bind(
      entry.employeeId || null,
      entry.bitrixId || null,
      entry.badgeNumber || null,
      entry.action,
      entry.status,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null
    )
    .run();
}

/**
 * Determine user role based on position
 */
function determineRole(employee: BitrixEmployee): 'employee' | 'hr_admin' {
  const position = (employee.ufCrm6WorkPosition || '').toLowerCase();

  if (
    position.includes('hr') ||
    position.includes('director') ||
    position.includes('human resources')
  ) {
    return 'hr_admin';
  }

  return 'employee';
}
