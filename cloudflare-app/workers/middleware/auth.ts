/**
 * Authentication Middleware
 * Reduces code duplication for auth checks across routes
 */

import { Context, Next } from 'hono';
import type { Env, SessionData } from '../types';
import { verifySession } from '../lib/auth';

/**
 * Middleware to require authentication
 * Returns 401 if session is invalid
 */
export const requireAuth = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const sessionId = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];

  if (!sessionId) {
    return c.json({ error: 'Unauthorized - No session' }, 401);
  }

  const session = await verifySession(c.env, sessionId);

  if (!session) {
    return c.json({ error: 'Unauthorized - Invalid session' }, 401);
  }

  // Store session in context for use in route handlers
  c.set('session', session);
  c.set('sessionId', sessionId);

  await next();
};

/**
 * Middleware to require admin role
 * Returns 403 if user is not an admin
 */
export const requireAdmin = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const session = c.get('session') as SessionData;

  if (!session) {
    return c.json({ error: 'Unauthorized - No session' }, 401);
  }

  if (session.role !== 'hr_admin') {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
};

/**
 * Get session from context
 * Helper function for route handlers
 */
export function getSession(c: Context<{ Bindings: Env }>): SessionData {
  const session = c.get('session') as SessionData;
  if (!session) {
    throw new Error('Session not found in context');
  }
  return session;
}

/**
 * Get session ID from context
 * Helper function for route handlers
 */
export function getSessionId(c: Context<{ Bindings: Env }>): string {
  const sessionId = c.get('sessionId') as string;
  if (!sessionId) {
    throw new Error('Session ID not found in context');
  }
  return sessionId;
}
