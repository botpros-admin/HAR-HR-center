import { Hono } from 'hono';
import type { Env } from '../types';
import { BitrixClient } from '../lib/bitrix';
import { verifySession } from '../lib/auth';

export const employeeRoutes = new Hono<{ Bindings: Env }>();

// Get employee profile
employeeRoutes.get('/profile', async (c) => {
  const env = c.env;

  // Get session token from Authorization header or cookie
  let sessionId = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!sessionId) {
    sessionId = c.req.header('Cookie')
      ?.split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];
  }

  if (!sessionId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await verifySession(env, sessionId);
  if (!session) {
    return c.json({ error: 'Invalid session' }, 401);
  }

  // Fetch full employee data from Bitrix24
  const bitrix = new BitrixClient(env);
  const employee = await bitrix.getEmployee(session.bitrixId);

  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  // Map Bitrix24 data to frontend format
  return c.json({
    id: employee.id,
    bitrixId: employee.id,
    badgeNumber: employee.ufCrm6BadgeNumber || '',
    fullName: `${employee.ufCrm6Name || ''} ${employee.ufCrm6LastName || ''}`.trim(),
    preferredName: employee.ufCrm6SecondName || null,
    email: employee.ufCrm6Email?.[0] || '',
    phone: employee.ufCrm6PersonalMobile?.[0] || employee.ufCrm6WorkPhone || null,
    dateOfBirth: employee.ufCrm6PersonalBirthday || null,
    hireDate: employee.ufCrm6EmploymentStartDate || null,
    department: employee.ufCrm6Subsidiary || null,
    position: employee.ufCrm6WorkPosition || null,
    manager: null, // Not in Bitrix24 data currently
    employmentStatus: employee.ufCrm6EmploymentStatus === 'Y' ? 'Active' : 'Inactive',
    employmentType: employee.ufCrm6EmploymentType || null,
    workLocation: null, // Not in Bitrix24 data currently
    address: {
      street: employee.ufCrm6UfLegalAddress || null,
      city: null,
      state: null,
      zip: null,
    },
  });
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
