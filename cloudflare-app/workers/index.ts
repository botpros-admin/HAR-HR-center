/**
 * Hartzell HR Center - Main Worker
 * Handles all API requests and authentication
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { employeeRoutes } from './routes/employee';
import { signatureRoutes } from './routes/signatures';
import { adminRoutes } from './routes/admin';
import { applicationRoutes } from './routes/applications';
import { validateCsrf } from './middleware/csrf';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'https://hartzell.work',
      'https://app.hartzell.work',
      'http://localhost:3000',
    ];

    // Handle requests without Origin header (health checks, service-to-service)
    if (!origin) {
      return allowedOrigins[0];
    }

    // Allow any Cloudflare Pages deployment
    if (origin.endsWith('.hartzell-hr-frontend.pages.dev')) {
      return origin;
    }

    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    return allowedOrigins[0]; // Default fallback
  },
  credentials: true,
}));

// CSRF Protection (validates POST/PUT/DELETE/PATCH requests)
app.use('/api/*', validateCsrf);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve public assets from R2 (logo, images, etc.)
app.get('/assets/*', async (c) => {
  const path = c.req.path.replace('/assets/', '');
  const object = await c.env.ASSETS.get(path);

  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

  return new Response(object.body, {
    headers,
  });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/employee', employeeRoutes);
app.route('/api/signatures', signatureRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/applications', applicationRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

export default app;
