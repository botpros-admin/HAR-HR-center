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
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'https://hartzell.work',
      'http://localhost:3000',
    ];

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

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/employee', employeeRoutes);
app.route('/api/signatures', signatureRoutes);
app.route('/api/admin', adminRoutes);

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
