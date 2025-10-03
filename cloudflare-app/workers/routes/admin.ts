import { Hono } from 'hono';
import type { Env } from '../types';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Admin endpoints (placeholder for future)
adminRoutes.get('/stats', async (c) => {
  return c.json({ message: 'Admin stats endpoint' });
});
