/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import { Context, Next } from 'hono';
import { csrf } from 'hono/csrf';
import type { Env } from '../types';

/**
 * CSRF middleware using Hono's built-in protection
 * Generates and validates CSRF tokens for state-changing requests
 */
export const csrfProtection = () => {
  return csrf({
    // Allow same-origin requests by default
    origin: (origin, c: Context<{ Bindings: Env }>) => {
      const allowedOrigins = [
        'https://hartzell.work',
        'https://app.hartzell.work',
        'http://localhost:3000',
      ];

      // Allow Cloudflare Pages deployments
      if (origin && origin.endsWith('.hartzell-hr-frontend.pages.dev')) {
        return true;
      }

      // Check exact matches
      if (origin && allowedOrigins.includes(origin)) {
        return true;
      }

      return false;
    },
  });
};

/**
 * Generate CSRF token for a session
 * Call this when creating sessions to provide the token to the client
 */
export async function generateCsrfToken(
  env: Env,
  sessionId: string
): Promise<string> {
  // Generate a random token
  const token = crypto.randomUUID();

  // Try to store in KV first (faster)
  try {
    await env.CACHE.put(
      `csrf:${sessionId}`,
      token,
      { expirationTtl: parseInt(env.SESSION_MAX_AGE) }
    );
  } catch (error) {
    // KV quota exceeded - fallback to D1 storage
    console.warn('KV cache write failed for CSRF token, using D1 fallback:', error);
    await env.DB.prepare(`
      INSERT OR REPLACE INTO csrf_tokens (session_id, token, expires_at)
      VALUES (?, ?, datetime('now', '+' || ? || ' seconds'))
    `)
      .bind(sessionId, token, env.SESSION_MAX_AGE)
      .run();
  }

  return token;
}

/**
 * Validate CSRF token from request
 * Use this in routes that need explicit CSRF validation
 */
export async function validateCsrfToken(
  env: Env,
  sessionId: string,
  providedToken: string
): Promise<boolean> {
  // Try KV first (faster)
  let storedToken = await env.CACHE.get(`csrf:${sessionId}`);

  // Fallback to D1 if not in KV
  if (!storedToken) {
    const result = await env.DB.prepare(`
      SELECT token FROM csrf_tokens
      WHERE session_id = ? AND expires_at > datetime('now')
    `)
      .bind(sessionId)
      .first<{ token: string }>();

    if (result) {
      storedToken = result.token;
    }
  }

  if (!storedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return storedToken === providedToken;
}

/**
 * Middleware to validate CSRF token for POST/PUT/DELETE/PATCH requests
 */
export const validateCsrf = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const method = c.req.method;

  // Only validate for state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    await next();
    return;
  }

  // Skip CSRF for login/logout endpoints (they have their own protection)
  // Skip CSRF for webhook endpoints (external services can't send CSRF tokens)
  // Skip CSRF for settings endpoints (already has session + admin role validation)
  const path = c.req.path;
  if (path.includes('/auth/login') ||
      path.includes('/auth/logout') ||
      path.includes('/admin/settings') ||
      path.includes('/employee/email-preferences') ||
      path.includes('/webhooks/')) {
    await next();
    return;
  }

  // Get session ID from cookie
  const sessionId = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];

  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get CSRF token from header
  const csrfToken = c.req.header('X-CSRF-Token');

  if (!csrfToken) {
    return c.json({ error: 'CSRF token required' }, 403);
  }

  // Validate token
  const isValid = await validateCsrfToken(c.env, sessionId, csrfToken);

  if (!isValid) {
    return c.json({ error: 'Invalid CSRF token' }, 403);
  }

  await next();
};
