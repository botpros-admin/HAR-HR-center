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

// Update employee profile
employeeRoutes.put('/profile', async (c) => {
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

  // Parse request body
  const body = await c.req.json();
  const { field, value } = body;

  if (!field) {
    return c.json({ error: 'Field is required' }, 400);
  }

  // Map frontend field names to Bitrix field names
  const fieldMapping: Record<string, string> = {
    preferredName: 'ufCrm6SecondName',
    email: 'ufCrm6Email',
    phone: 'ufCrm6PersonalMobile',
    position: 'ufCrm6WorkPosition',
    department: 'ufCrm6Subsidiary',
    address: 'ufCrm6UfLegalAddress',
  };

  const bitrixField = fieldMapping[field];
  if (!bitrixField) {
    return c.json({ error: 'Invalid field' }, 400);
  }

  // Prepare update data
  const updateData: Record<string, any> = {};

  // Handle special cases for multi-value fields
  if (field === 'email' || field === 'phone') {
    updateData[bitrixField] = [value];
  } else {
    updateData[bitrixField] = value;
  }

  // Update in Bitrix24
  const bitrix = new BitrixClient(env);
  const updatedEmployee = await bitrix.updateEmployee(session.bitrixId, updateData);

  if (!updatedEmployee) {
    return c.json({ error: 'Failed to update employee' }, 500);
  }

  // Return updated profile
  return c.json({
    id: updatedEmployee.id,
    bitrixId: updatedEmployee.id,
    badgeNumber: updatedEmployee.ufCrm6BadgeNumber || '',
    fullName: `${updatedEmployee.ufCrm6Name || ''} ${updatedEmployee.ufCrm6LastName || ''}`.trim(),
    preferredName: updatedEmployee.ufCrm6SecondName || null,
    email: updatedEmployee.ufCrm6Email?.[0] || '',
    phone: updatedEmployee.ufCrm6PersonalMobile?.[0] || updatedEmployee.ufCrm6WorkPhone || null,
    dateOfBirth: updatedEmployee.ufCrm6PersonalBirthday || null,
    hireDate: updatedEmployee.ufCrm6EmploymentStartDate || null,
    department: updatedEmployee.ufCrm6Subsidiary || null,
    position: updatedEmployee.ufCrm6WorkPosition || null,
    manager: null,
    employmentStatus: updatedEmployee.ufCrm6EmploymentStatus === 'Y' ? 'Active' : 'Inactive',
    employmentType: updatedEmployee.ufCrm6EmploymentType || null,
    workLocation: null,
    address: {
      street: updatedEmployee.ufCrm6UfLegalAddress || null,
      city: null,
      state: null,
      zip: null,
    },
  });
});
