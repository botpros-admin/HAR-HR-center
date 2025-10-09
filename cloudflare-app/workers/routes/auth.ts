/**
 * Authentication Routes
 * DOB + Employee ID + Last 4 SSN + CAPTCHA
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, LoginRequest, SSNVerificationRequest, SessionData, AuditLogEntry } from '../types';
import { BitrixClient } from '../lib/bitrix';
import { checkRateLimit, verifyCaptcha, createSession, verifySession, auditLog, resetRateLimit } from '../lib/auth';
import { maskSSN } from '../lib/pii';
import { generateCsrfToken } from '../middleware/csrf';

const auth = new Hono<{ Bindings: Env }>();

// Validation schemas
const loginSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  turnstileToken: z.string().optional()
});

const ssnVerifySchema = z.object({
  sessionId: z.string().uuid(),
  ssnLast4: z.string().regex(/^\d{4}$/, 'Must be 4 digits')
});

/**
 * POST /api/auth/login
 * Step 1: Verify Employee ID + DOB
 */
auth.post('/login', async (c) => {
  const env = c.env;
  const body = await c.req.json<LoginRequest>();

  // Validate input
  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return c.json({
      error: 'Validation failed',
      details: validation.error.flatten()
    }, 400);
  }

  const { employeeId, dateOfBirth, turnstileToken } = validation.data;
  const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';
  const userAgent = c.req.header('User-Agent') || 'unknown';

  try {
    // Check rate limit
    const rateLimit = await checkRateLimit(env, employeeId, 'login');

    if (!rateLimit.allowed) {
      await auditLog(env, {
        badgeNumber: employeeId,
        action: 'login_attempt',
        status: 'blocked',
        ipAddress,
        userAgent,
        metadata: { reason: 'rate_limit_exceeded' }
      });

      return c.json({
        error: 'Too many attempts. Try again later.',
        blockedUntil: new Date(rateLimit.resetAt * 1000).toISOString()
      }, 429);
    }

    // Require CAPTCHA after threshold
    if (rateLimit.requiresCaptcha && !turnstileToken) {
      return c.json({
        error: 'CAPTCHA required',
        requiresCaptcha: true
      }, 400);
    }

    // Verify CAPTCHA if provided
    if (turnstileToken) {
      const captchaValid = await verifyCaptcha(env, turnstileToken, ipAddress);
      if (!captchaValid) {
        return c.json({ error: 'CAPTCHA verification failed' }, 400);
      }
    }

    // Query Bitrix24 for employee
    const bitrix = new BitrixClient(env);
    const employee = await bitrix.getEmployeeByBadgeNumber(employeeId);

    if (!employee) {
      await auditLog(env, {
        badgeNumber: employeeId,
        action: 'login_attempt',
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: { reason: 'employee_not_found' }
      });

      return c.json({ error: 'Invalid Employee ID or Date of Birth' }, 401);
    }

    // Verify DOB
    const employeeDOB = new Date(employee.ufCrm6PersonalBirthday)
      .toISOString()
      .split('T')[0];

    if (employeeDOB !== dateOfBirth) {
      await auditLog(env, {
        badgeNumber: employeeId,
        bitrixId: employee.id,
        action: 'login_attempt',
        status: 'failure',
        ipAddress,
        userAgent,
        metadata: { reason: 'dob_mismatch' }
      });

      return c.json({ error: 'Invalid Employee ID or Date of Birth' }, 401);
    }

    // Determine if SSN verification is required
    const requiresSSN = await shouldRequireSSN(env, employee);

    if (!requiresSSN) {
      // Create session immediately
      const session = await createSession(env, employee, ipAddress, userAgent);

      // Generate CSRF token
      const csrfToken = await generateCsrfToken(env, session.id);

      await resetRateLimit(env, employeeId, 'login');

      await auditLog(env, {
        employeeId: session.employeeId,
        bitrixId: session.bitrixId,
        badgeNumber: session.badgeNumber,
        action: 'login_success',
        status: 'success',
        ipAddress,
        userAgent
      });

      return c.json({
        success: true,
        session: {
          id: session.id,
          employeeId: session.employeeId,
          bitrixId: session.bitrixId,
          badgeNumber: session.badgeNumber,
          name: session.name,
          email: session.email,
          role: session.role
        },
        csrfToken,
        requiresSSN: false
      }, 200, {
        'Set-Cookie': buildSessionCookie(session.id, env, c.req.header('Host'))
      });
    }

    // Create temporary pre-auth session (5 minutes)
    // Note: Store only last 4 of SSN, never the full SSN
    const preAuthSession = crypto.randomUUID();
    await env.CACHE.put(
      `preauth:${preAuthSession}`,
      JSON.stringify({
        employeeId: employee.id,
        bitrixId: employee.id,
        badgeNumber: employee.ufCrm6BadgeNumber,
        ssnLast4: employee.ufCrm6Ssn?.slice(-4), // Only last 4, never full SSN
        ipAddress,
        userAgent
      }),
      { expirationTtl: 300 } // 5 minutes
    );

    await auditLog(env, {
      employeeId: employee.id,
      bitrixId: employee.id,
      badgeNumber: employee.ufCrm6BadgeNumber,
      action: 'login_ssn_required',
      status: 'success',
      ipAddress,
      userAgent
    });

    return c.json({
      success: true,
      requiresSSN: true,
      preAuthSession,
      message: 'Please verify your identity'
    });

  } catch (error) {
    console.error('Login error:', error);

    await auditLog(env, {
      badgeNumber: employeeId,
      action: 'login_error',
      status: 'failure',
      ipAddress,
      userAgent,
      metadata: { error: (error as Error).message }
    });

    return c.json({ error: 'Authentication failed' }, 500);
  }
});

/**
 * POST /api/auth/verify-ssn
 * Step 2: Verify Last 4 SSN (for sensitive actions)
 */
auth.post('/verify-ssn', async (c) => {
  const env = c.env;
  const body = await c.req.json<SSNVerificationRequest>();

  const validation = ssnVerifySchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  const { sessionId, ssnLast4 } = validation.data;
  const ipAddress = c.req.header('CF-Connecting-IP') || 'unknown';
  const userAgent = c.req.header('User-Agent') || 'unknown';

  try {
    // Get pre-auth session
    const preAuthData = await env.CACHE.get(`preauth:${sessionId}`);
    if (!preAuthData) {
      return c.json({ error: 'Session expired. Please log in again.' }, 401);
    }

    const preAuth = JSON.parse(preAuthData);

    // Verify SSN
    if (preAuth.ssnLast4 !== ssnLast4) {
      await auditLog(env, {
        employeeId: preAuth.employeeId,
        bitrixId: preAuth.bitrixId,
        badgeNumber: preAuth.badgeNumber,
        action: 'ssn_verification',
        status: 'failure',
        ipAddress,
        userAgent
      });

      return c.json({ error: 'Verification failed' }, 401);
    }

    // Get full employee data
    const bitrix = new BitrixClient(env);
    const employee = await bitrix.getEmployee(preAuth.bitrixId);

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Create full session
    const session = await createSession(env, employee, ipAddress, userAgent);

    // Generate CSRF token
    const csrfToken = await generateCsrfToken(env, session.id);

    await resetRateLimit(env, preAuth.badgeNumber, 'login');

    // Delete pre-auth session
    await env.CACHE.delete(`preauth:${sessionId}`);

    await auditLog(env, {
      employeeId: session.employeeId,
      bitrixId: session.bitrixId,
      badgeNumber: session.badgeNumber,
      action: 'login_success_with_ssn',
      status: 'success',
      ipAddress,
      userAgent
    });

    return c.json({
      success: true,
      session: {
        id: session.id,
        employeeId: session.employeeId,
        bitrixId: session.bitrixId,
        badgeNumber: session.badgeNumber,
        name: session.name,
        email: session.email,
        role: session.role
      },
      csrfToken
    }, 200, {
      'Set-Cookie': buildSessionCookie(session.id, env, c.req.header('Host'))
    });

  } catch (error) {
    console.error('SSN verification error:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

/**
 * POST /api/auth/logout
 */
auth.post('/logout', async (c) => {
  const env = c.env;

  // Try Authorization header first, then fall back to cookie
  let sessionId = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!sessionId) {
    sessionId = c.req.header('Cookie')
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];
  }

  if (sessionId) {
    // Delete session from D1
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?')
      .bind(sessionId)
      .run();

    // Delete from KV cache
    await env.CACHE.delete(`session:${sessionId}`);

    await auditLog(env, {
      action: 'logout',
      status: 'success',
      ipAddress: c.req.header('CF-Connecting-IP') || 'unknown'
    });
  }

  return c.json({ success: true }, 200, {
    'Set-Cookie': buildClearedSessionCookie(env, c.req.header('Host'))
  });
});

/**
 * GET /api/auth/session
 * Validate current session
 */
auth.get('/session', async (c) => {
  const env = c.env;

  // Try Authorization header first, then fall back to cookie
  let sessionId = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!sessionId) {
    sessionId = c.req.header('Cookie')
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];
  }

  if (!sessionId) {
    return c.json({ error: 'No session' }, 401);
  }

  const session = await verifySession(env, sessionId);
  if (!session) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  // Generate/refresh CSRF token
  const csrfToken = await generateCsrfToken(env, sessionId);

  return c.json({
    valid: true,
    session: {
      name: session.name,
      email: session.email,
      role: session.role,
      badgeNumber: session.badgeNumber
    },
    csrfToken
  });
});

/**
 * Helper: Determine if SSN verification is required
 */
async function shouldRequireSSN(env: Env, employee: any): Promise<boolean> {
  // Skip SSN verification if employee doesn't have an SSN on file
  if (!employee.ufCrm6Ssn || employee.ufCrm6Ssn.trim() === '') {
    return false;
  }

  const config = await env.DB.prepare(
    `SELECT value FROM system_config WHERE key = 'require_ssn_for_sensitive'`
  ).first<{ value: string }>();

  return config?.value === 'true';
}

function buildSessionCookie(sessionId: string, env: Env, hostHeader?: string | null): string {
  const parts = [
    `session=${sessionId}`,
    'HttpOnly',
    'Secure',
    'Path=/',
    `Max-Age=${env.SESSION_MAX_AGE}`,
    'SameSite=None'
  ];

  const cookieDomain = getCookieDomain(hostHeader);
  if (cookieDomain) {
    parts.push(`Domain=${cookieDomain}`);
  }

  return parts.join('; ');
}

function buildClearedSessionCookie(env: Env, hostHeader?: string | null): string {
  const parts = [
    'session=',
    'HttpOnly',
    'Secure',
    'Path=/',
    'Max-Age=0',
    'SameSite=None'
  ];

  const cookieDomain = getCookieDomain(hostHeader);
  if (cookieDomain) {
    parts.push(`Domain=${cookieDomain}`);
  }

  return parts.join('; ');
}

function getCookieDomain(hostHeader?: string | null): string | undefined {
  if (!hostHeader) {
    return undefined;
  }

  const host = hostHeader.toLowerCase();

  if (host === 'hartzell.work' || host.endsWith('.hartzell.work')) {
    return '.hartzell.work';
  }

  return undefined;
}

export { auth as authRoutes };
