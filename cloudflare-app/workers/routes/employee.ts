import { Hono } from 'hono';
import type { Env } from '../types';

export const employeeRoutes = new Hono<{ Bindings: Env }>();

// Get employee profile
employeeRoutes.get('/profile', async (c) => {
  // TODO: Implement employee profile fetching
  return c.json({ message: 'Employee profile endpoint' });
});

// Get dashboard summary
employeeRoutes.get('/dashboard', async (c) => {
  return c.json({
    pendingSignatures: 0,
    pendingTasks: 0,
    recentDocuments: 0,
    profileComplete: 100
  });
});

// Get pending tasks
employeeRoutes.get('/tasks', async (c) => {
  return c.json([]);
});

// Get documents
employeeRoutes.get('/documents', async (c) => {
  return c.json([]);
});
