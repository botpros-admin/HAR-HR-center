import { Hono } from 'hono';
import type { Env } from '../types';

export const signatureRoutes = new Hono<{ Bindings: Env }>();

// Get pending signatures
signatureRoutes.get('/pending', async (c) => {
  return c.json([]);
});

// Get signature URL
signatureRoutes.get('/:id/url', async (c) => {
  const id = c.req.param('id');
  return c.json({ url: `https://app.opensignlabs.com/sign/${id}` });
});

// OpenSign webhook handler
signatureRoutes.post('/webhooks/opensign', async (c) => {
  // TODO: Implement webhook verification and processing
  return c.json({ received: true });
});
