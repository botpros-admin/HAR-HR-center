import { Hono } from 'hono';
import type { Env } from '../types';
import { BitrixClient } from '../lib/bitrix';
import { verifySession } from '../lib/auth';
import { maskSalary } from '../lib/pii';

// Helper function to clean address data from Bitrix (removes delimiter and IDs)
function cleanAddress(address: any): string | null {
  console.log('[CLEAN ADDRESS] Input:', address, 'Type:', typeof address);

  if (!address) {
    console.log('[CLEAN ADDRESS] Null/undefined input, returning null');
    return null;
  }

  // Handle if address is an object (some Bitrix address types)
  if (typeof address === 'object' && address.ADDRESS_1) {
    console.log('[CLEAN ADDRESS] Object with ADDRESS_1:', address.ADDRESS_1);
    return address.ADDRESS_1;
  }

  // Handle string format with delimiters like "123 Main St|;|360"
  if (typeof address === 'string') {
    const parts = address.split('|;|');
    const cleaned = parts[0].trim();
    console.log('[CLEAN ADDRESS] String split result:', parts, 'Cleaned:', cleaned);
    return cleaned || null;
  }

  console.log('[CLEAN ADDRESS] Unhandled type, returning null');
  return null;
}

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

  // Parse additional info to get extended data
  let additionalInfo: any = {};
  try {
    additionalInfo = JSON.parse(employee.ufCrm6AdditionalInfo || '{}');
  } catch (error) {
    console.error('Failed to parse additionalInfo:', error);
  }

  // Map Bitrix24 data to frontend format
  return c.json({
    id: employee.id,
    bitrixId: employee.id,
    badgeNumber: employee.ufCrm6BadgeNumber || '',
    fullName: `${employee.ufCrm6Name || ''} ${employee.ufCrm6LastName || ''}`.trim(),
    firstName: employee.ufCrm6Name || '',
    middleName: employee.ufCrm6SecondName || null,
    lastName: employee.ufCrm6LastName || '',
    preferredName: employee.ufCrm6PreferredName || null,
    email: employee.ufCrm6Email?.[0] || '',
    phone: employee.ufCrm6PersonalMobile?.[0] || employee.ufCrm6WorkPhone || null,
    dateOfBirth: employee.ufCrm6PersonalBirthday || null,
    hireDate: employee.ufCrm6EmploymentStartDate || null,
    department: employee.ufCrm6Subsidiary || null,
    position: employee.ufCrm6WorkPosition || null,
    manager: null, // Not in Bitrix24 data currently
    employmentStatus: employee.ufCrm6EmploymentStatus === 'Y' ? 'Active' : 'Inactive',
    employmentType: employee.ufCrm6EmploymentType || additionalInfo.employmentType || null,
    shift: employee.ufCrm6Shift || additionalInfo.shiftPreference || null,
    workLocation: null, // Not in Bitrix24 data currently
    address: {
      street: (() => {
        // Get raw address from all possible sources
        const raw1 = employee.ufCrm6Address;
        const raw2 = employee.ufCrm6UfLegalAddress;
        const raw3 = additionalInfo.address;

        let rawAddress = raw1 || raw2 || raw3;

        // AGGRESSIVE CLEAN: Always split on |;| if it's a string
        if (typeof rawAddress === 'string') {
          const parts = rawAddress.split('|;|');
          rawAddress = parts[0].trim();
        }

        console.log('[ADDRESS FINAL]', {
          raw1, raw2, raw3,
          result: rawAddress
        });

        return rawAddress || null;
      })(),
      city: null,
      state: null,
      zip: null,
    },

    // Education
    education: {
      level: employee.ufCrm6EducationLevel || additionalInfo.educationLevel || null,
      school: employee.ufCrm6SchoolName || additionalInfo.schoolName || null,
      graduationYear: employee.ufCrm6GraduationYear || additionalInfo.graduationYear || null,
      fieldOfStudy: employee.ufCrm6FieldOfStudy || additionalInfo.fieldOfStudy || null,
    },

    // Skills & Certifications
    skills: employee.ufCrm6Skills || additionalInfo.skills || null,
    certifications: employee.ufCrm6Certifications || additionalInfo.certifications || null,
    softwareExperience: employee.ufCrm6SoftwareExperience || additionalInfo.softwareExperience || null,

    // Work Experience
    workExperiences: additionalInfo.workExperiences || [],
    yearsExperience: additionalInfo.yearsExperience || null,

    // References
    references: [
      additionalInfo.reference1 || null,
      additionalInfo.reference2 || null,
    ].filter(Boolean),

    // Documents
    documents: {
      resumeUrl: additionalInfo.resumeUrl || null,
      coverLetterUrl: additionalInfo.coverLetterUrl || null,
      applicationId: additionalInfo.applicationId || null,
      submittedAt: additionalInfo.submittedAt || null,
    },

    // Additional application data (sensitive fields masked)
    desiredSalary: additionalInfo.desiredSalary ? maskSalary(additionalInfo.desiredSalary) : null,
    availableStartDate: additionalInfo.availableStartDate || null,
    willingToRelocate: additionalInfo.willingToRelocate || null,
    authorizedToWork: additionalInfo.authorizedToWork || null,
    requiresSponsorship: additionalInfo.requiresSponsorship || null,
    howDidYouHear: additionalInfo.howDidYouHear || null,
    // DO NOT expose: felonyConviction, felonyExplanation, backgroundCheckConsent
  }, 200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
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

// Get documents (all document assignments for employee)
employeeRoutes.get('/documents', async (c) => {
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

  try {
    // Query all document assignments for this employee
    const result = await env.DB.prepare(`
      SELECT
        da.id,
        da.template_id,
        da.bitrix_id,
        da.status,
        da.priority,
        da.due_date,
        da.assigned_at,
        da.signed_at,
        da.signed_document_url,
        da.signature_request_id,
        dt.title,
        dt.description,
        dt.category,
        dt.template_url,
        dt.file_name,
        dt.requires_signature,
        dt.field_positions,
        sr.status as signature_status
      FROM document_assignments da
      JOIN document_templates dt ON da.template_id = dt.id
      LEFT JOIN signature_requests sr ON da.signature_request_id = sr.id
      WHERE da.bitrix_id = ?
      ORDER BY
        CASE da.status
          WHEN 'sent' THEN 1
          WHEN 'assigned' THEN 2
          WHEN 'signed' THEN 3
          WHEN 'expired' THEN 4
          WHEN 'declined' THEN 5
        END,
        da.due_date ASC,
        da.assigned_at DESC
    `).bind(session.bitrixId).all();

    // Map to frontend format
    const documents = result.results.map((doc: any) => ({
      id: doc.id,
      templateId: doc.template_id,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      status: doc.status,
      priority: doc.priority,
      requiresSignature: doc.requires_signature === 1,
      signatureStatus: doc.signature_status,
      signatureRequestId: doc.signature_request_id,
      templateUrl: doc.template_url,
      fileName: doc.file_name,
      fieldPositions: doc.field_positions,
      signedDocumentUrl: doc.signed_document_url,
      dueDate: doc.due_date,
      assignedAt: doc.assigned_at,
      signedAt: doc.signed_at,
      // Computed fields for UI
      needsAttention: doc.status === 'sent' || doc.status === 'assigned',
      isUrgent: doc.priority === 'high' && doc.status !== 'signed',
      isComplete: doc.status === 'signed',
      isExpired: doc.status === 'expired'
    }));

    // Note: Native signature system handles signatures via /api/signatures/sign-native endpoint
    // No background processing needed - employees sign directly through the portal

    return c.json(documents);

  } catch (error) {
    console.error('Error fetching documents:', error);
    return c.json({ error: 'Failed to fetch documents', details: (error as Error).message }, 500);
  }
});

// Download assigned document by assignment ID
employeeRoutes.get('/documents/download/:assignmentId', async (c) => {
  const env = c.env;
  const assignmentId = c.req.param('assignmentId');

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

  try {
    // Get assignment and verify it belongs to this employee
    const assignment = await env.DB.prepare(`
      SELECT da.*, dt.template_url, dt.file_name
      FROM document_assignments da
      JOIN document_templates dt ON da.template_id = dt.id
      WHERE da.id = ? AND da.bitrix_id = ?
    `).bind(assignmentId, session.bitrixId).first();

    if (!assignment) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // Determine which file to download
    let r2Key: string;
    let fileName: string;

    if (assignment.status === 'signed' && assignment.signed_document_url) {
      // Download signed version
      r2Key = assignment.signed_document_url.replace('r2://hartzell-hr-templates/', '');
      fileName = `signed_${assignment.file_name}`;
    } else {
      // Download template version
      r2Key = assignment.template_url as string;
      fileName = assignment.file_name as string;
    }

    // Fetch from R2
    const object = await env.DOCUMENTS.get(r2Key);

    if (!object) {
      return c.json({ error: 'File not found in storage' }, 404);
    }

    // Return file
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Disposition', `inline; filename="${fileName}"`);
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/pdf');

    return new Response(object.body, { headers });

  } catch (error) {
    console.error('Error downloading document:', error);
    return c.json({ error: 'Failed to download document', details: (error as Error).message }, 500);
  }
});

// Download employee documents (resume, cover letter) from R2
employeeRoutes.get('/documents/:type', async (c) => {
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

  const type = c.req.param('type'); // 'resume' or 'cover-letter'

  // Get employee data from Bitrix24
  const bitrix = new BitrixClient(env);
  const employee = await bitrix.getEmployee(session.bitrixId);

  if (!employee) {
    return c.json({ error: 'Employee not found' }, 404);
  }

  // Parse additional info to get document URLs
  let additionalInfo: any = {};
  try {
    additionalInfo = JSON.parse(employee.ufCrm6AdditionalInfo || '{}');
  } catch (error) {
    console.error('Failed to parse additionalInfo:', error);
  }

  const documentKey = type === 'resume' ? additionalInfo.resumeUrl : additionalInfo.coverLetterUrl;

  if (!documentKey) {
    return c.json({ error: 'Document not found' }, 404);
  }

  // Fetch document from R2
  const object = await env.DOCUMENTS.get(documentKey);

  if (!object) {
    return c.json({ error: 'Document not found in storage' }, 404);
  }

  // Set headers for download
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="${documentKey.split('/').pop()}"`);
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');

  return new Response(object.body, { headers });
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
    preferredName: 'ufCrm6PreferredName',
    email: 'ufCrm6Email',
    phone: 'ufCrm6PersonalMobile',
    position: 'ufCrm6WorkPosition',
    department: 'ufCrm6Subsidiary',
    address: 'ufCrm6Address',
    street: 'ufCrm6Address', // Map street to address for bulk updates
    skills: 'ufCrm6Skills',
    certifications: 'ufCrm6Certifications',
    softwareExperience: 'ufCrm6SoftwareExperience',
  };

  // Prepare update data
  const updateData: Record<string, any> = {};

  // Handle bulk updates (when field === 'bulk')
  if (field === 'bulk') {
    // Loop through all properties in body except 'field'
    for (const [key, val] of Object.entries(body)) {
      if (key === 'field') continue; // Skip the 'field' property itself

      const bitrixField = fieldMapping[key];
      if (bitrixField) {
        // Handle special cases for multi-value fields
        if (key === 'email' || key === 'phone') {
          updateData[bitrixField] = [val];
        } else {
          updateData[bitrixField] = val;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }
  } else {
    // Single field update
    const bitrixField = fieldMapping[field];
    if (!bitrixField) {
      return c.json({ error: 'Invalid field' }, 400);
    }

    // Handle special cases for multi-value fields
    if (field === 'email' || field === 'phone') {
      updateData[bitrixField] = [value];
    } else {
      updateData[bitrixField] = value;
    }
  }

  // Update in Bitrix24
  const bitrix = new BitrixClient(env);
  const updatedEmployee = await bitrix.updateEmployee(session.bitrixId, updateData);

  if (!updatedEmployee) {
    return c.json({ error: 'Failed to update employee' }, 500);
  }

  // Parse additional info to get extended data
  let additionalInfo: any = {};
  try {
    additionalInfo = JSON.parse(updatedEmployee.ufCrm6AdditionalInfo || '{}');
  } catch (error) {
    console.error('Failed to parse additionalInfo:', error);
  }

  // Return updated profile
  return c.json({
    id: updatedEmployee.id,
    bitrixId: updatedEmployee.id,
    badgeNumber: updatedEmployee.ufCrm6BadgeNumber || '',
    fullName: `${updatedEmployee.ufCrm6Name || ''} ${updatedEmployee.ufCrm6LastName || ''}`.trim(),
    firstName: updatedEmployee.ufCrm6Name || '',
    middleName: updatedEmployee.ufCrm6SecondName || null,
    lastName: updatedEmployee.ufCrm6LastName || '',
    preferredName: updatedEmployee.ufCrm6PreferredName || null,
    email: updatedEmployee.ufCrm6Email?.[0] || '',
    phone: updatedEmployee.ufCrm6PersonalMobile?.[0] || updatedEmployee.ufCrm6WorkPhone || null,
    dateOfBirth: updatedEmployee.ufCrm6PersonalBirthday || null,
    hireDate: updatedEmployee.ufCrm6EmploymentStartDate || null,
    department: updatedEmployee.ufCrm6Subsidiary || null,
    position: updatedEmployee.ufCrm6WorkPosition || null,
    manager: null,
    employmentStatus: updatedEmployee.ufCrm6EmploymentStatus === 'Y' ? 'Active' : 'Inactive',
    employmentType: updatedEmployee.ufCrm6EmploymentType || additionalInfo.employmentType || null,
    shift: updatedEmployee.ufCrm6Shift || additionalInfo.shiftPreference || null,
    workLocation: null,
    address: {
      street: (() => {
        let rawAddress = updatedEmployee.ufCrm6Address || updatedEmployee.ufCrm6UfLegalAddress || additionalInfo.address;
        if (typeof rawAddress === 'string') {
          rawAddress = rawAddress.split('|;|')[0].trim();
        }
        return rawAddress || null;
      })(),
      city: null,
      state: null,
      zip: null,
    },

    // Education
    education: {
      level: updatedEmployee.ufCrm6EducationLevel || additionalInfo.educationLevel || null,
      school: updatedEmployee.ufCrm6SchoolName || additionalInfo.schoolName || null,
      graduationYear: updatedEmployee.ufCrm6GraduationYear || additionalInfo.graduationYear || null,
      fieldOfStudy: updatedEmployee.ufCrm6FieldOfStudy || additionalInfo.fieldOfStudy || null,
    },

    // Skills & Certifications
    skills: updatedEmployee.ufCrm6Skills || additionalInfo.skills || null,
    certifications: updatedEmployee.ufCrm6Certifications || additionalInfo.certifications || null,
    softwareExperience: updatedEmployee.ufCrm6SoftwareExperience || additionalInfo.softwareExperience || null,

    // Work Experience
    workExperiences: additionalInfo.workExperiences || [],
    yearsExperience: additionalInfo.yearsExperience || null,

    // References
    references: [
      additionalInfo.reference1 || null,
      additionalInfo.reference2 || null,
    ].filter(Boolean),

    // Documents
    documents: {
      resumeUrl: additionalInfo.resumeUrl || null,
      coverLetterUrl: additionalInfo.coverLetterUrl || null,
      applicationId: additionalInfo.applicationId || null,
      submittedAt: additionalInfo.submittedAt || null,
    },

    // Additional application data (sensitive fields masked)
    desiredSalary: additionalInfo.desiredSalary ? maskSalary(additionalInfo.desiredSalary) : null,
    availableStartDate: additionalInfo.availableStartDate || null,
    willingToRelocate: additionalInfo.willingToRelocate || null,
    authorizedToWork: additionalInfo.authorizedToWork || null,
    requiresSponsorship: additionalInfo.requiresSponsorship || null,
    howDidYouHear: additionalInfo.howDidYouHear || null,
    // DO NOT expose: felonyConviction, felonyExplanation, backgroundCheckConsent
  });
});

// Get employee signature
employeeRoutes.get('/profile/signature', async (c) => {
  const env = c.env;

  // Get session
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

  // Get signature from R2
  const signatureKey = `signatures/employee-${session.bitrixId}.png`;
  const object = await env.ASSETS.get(signatureKey);

  if (!object) {
    return c.json({ error: 'Signature not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'image/png');
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, { headers });
});

// Save employee signature
employeeRoutes.post('/profile/signature', async (c) => {
  const env = c.env;

  // Get session
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

  try {
    // Parse multipart form data
    const formData = await c.req.formData();
    const signatureFile = formData.get('signature') as File;

    if (!signatureFile) {
      return c.json({ error: 'No signature file provided' }, 400);
    }

    // Convert file to buffer
    const buffer = await signatureFile.arrayBuffer();

    // Save to R2
    const signatureKey = `signatures/employee-${session.bitrixId}.png`;
    await env.ASSETS.put(signatureKey, buffer, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });

    return c.json({ success: true, message: 'Signature saved successfully' });
  } catch (error) {
    console.error('Error saving signature:', error);
    return c.json({ error: 'Failed to save signature' }, 500);
  }
});

// Delete employee signature
employeeRoutes.delete('/profile/signature', async (c) => {
  const env = c.env;

  // Get session
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

  // Delete from R2
  const signatureKey = `signatures/employee-${session.bitrixId}.png`;
  await env.ASSETS.delete(signatureKey);

  return c.json({ success: true, message: 'Signature deleted successfully' });
});

// Get employee initials
employeeRoutes.get('/profile/initials', async (c) => {
  const env = c.env;

  // Get session
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

  // Get initials from R2
  const initialsKey = `signatures/employee-${session.bitrixId}-initials.png`;
  const object = await env.ASSETS.get(initialsKey);

  if (!object) {
    return c.json({ error: 'Initials not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'image/png');
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, { headers });
});

// Save employee initials
employeeRoutes.post('/profile/initials', async (c) => {
  const env = c.env;

  // Get session
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

  try {
    // Parse multipart form data
    const formData = await c.req.formData();
    const initialsFile = formData.get('signature') as File; // Keep as 'signature' for consistency with frontend

    if (!initialsFile) {
      return c.json({ error: 'No initials file provided' }, 400);
    }

    // Convert file to buffer
    const buffer = await initialsFile.arrayBuffer();

    // Save to R2
    const initialsKey = `signatures/employee-${session.bitrixId}-initials.png`;
    await env.ASSETS.put(initialsKey, buffer, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });

    return c.json({ success: true, message: 'Initials saved successfully' });
  } catch (error) {
    console.error('Error saving initials:', error);
    return c.json({ error: 'Failed to save initials' }, 500);
  }
});

// Delete employee initials
employeeRoutes.delete('/profile/initials', async (c) => {
  const env = c.env;

  // Get session
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

  // Delete from R2
  const initialsKey = `signatures/employee-${session.bitrixId}-initials.png`;
  await env.ASSETS.delete(initialsKey);

  return c.json({ success: true, message: 'Initials deleted successfully' });
});

// ========== EMAIL PREFERENCES ENDPOINTS ==========

// Get employee email preferences
employeeRoutes.get('/email-preferences', async (c) => {
  const env = c.env;

  // Get session
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

  try {
    const result = await env.DB.prepare(`
      SELECT * FROM email_preferences WHERE employee_id = ?
    `).bind(session.employee_id).first();

    if (!result) {
      // Return default preferences if not configured yet
      return c.json({
        preferences: {
          emailEnabled: true,
          notifyAssignments: true,
          notifyReminders: true,
          notifyOverdue: true,
          notifyConfirmations: true,
          alternativeEmail: null,
        }
      });
    }

    return c.json({
      preferences: {
        emailEnabled: result.email_enabled === 1,
        notifyAssignments: result.notify_assignments === 1,
        notifyReminders: result.notify_reminders === 1,
        notifyOverdue: result.notify_overdue === 1,
        notifyConfirmations: result.notify_confirmations === 1,
        alternativeEmail: result.alternative_email,
        updatedAt: result.updated_at,
      }
    });

  } catch (error) {
    console.error('[Employee] Error fetching email preferences:', error);
    return c.json({ error: 'Failed to fetch email preferences', details: (error as Error).message }, 500);
  }
});

// Update employee email preferences
employeeRoutes.put('/email-preferences', async (c) => {
  const env = c.env;

  // Get session
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

  try {
    const body = await c.req.json();
    console.log('[Employee] Update email preferences:', JSON.stringify(body, null, 2));

    // Validate input
    const { emailEnabled, notifyAssignments, notifyReminders, notifyOverdue, notifyConfirmations, alternativeEmail } = body;

    // Update preferences (INSERT or UPDATE)
    await env.DB.prepare(`
      INSERT INTO email_preferences (
        employee_id, email_enabled, notify_assignments, notify_reminders,
        notify_overdue, notify_confirmations, alternative_email, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(employee_id) DO UPDATE SET
        email_enabled = excluded.email_enabled,
        notify_assignments = excluded.notify_assignments,
        notify_reminders = excluded.notify_reminders,
        notify_overdue = excluded.notify_overdue,
        notify_confirmations = excluded.notify_confirmations,
        alternative_email = excluded.alternative_email,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      session.employee_id,
      emailEnabled ? 1 : 0,
      notifyAssignments ? 1 : 0,
      notifyReminders ? 1 : 0,
      notifyOverdue ? 1 : 0,
      notifyConfirmations ? 1 : 0,
      alternativeEmail || null
    ).run();

    // Log the change in audit log
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        employee_id, bitrix_id, action, status, metadata, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      session.employee_id,
      session.bitrixId,
      'email_preferences_updated',
      'success',
      JSON.stringify({
        emailEnabled,
        timestamp: new Date().toISOString()
      }),
      new Date().toISOString()
    ).run();

    console.log(`[Employee] Email preferences updated for employee ${session.employee_id}`);

    return c.json({
      success: true,
      message: 'Email preferences updated successfully',
      preferences: {
        emailEnabled,
        notifyAssignments,
        notifyReminders,
        notifyOverdue,
        notifyConfirmations,
        alternativeEmail
      }
    });

  } catch (error) {
    console.error('[Employee] Error updating email preferences:', error);

    // Log the failure
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (
          employee_id, bitrix_id, action, status, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        session.employee_id,
        session.bitrixId,
        'email_preferences_updated',
        'failure',
        JSON.stringify({
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }),
        new Date().toISOString()
      ).run();
    } catch (auditError) {
      console.error('[Employee] Failed to log audit entry:', auditError);
    }

    return c.json({ error: 'Failed to update email preferences', details: (error as Error).message }, 500);
  }
});
