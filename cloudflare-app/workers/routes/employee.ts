import { Hono } from 'hono';
import type { Env } from '../types';
import { BitrixClient } from '../lib/bitrix';
import { OpenSignClient } from '../lib/opensign';
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
        sr.opensign_url,
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
      signatureUrl: doc.opensign_url,
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

    // Background: Auto-retry signature request creation for stuck documents
    // This runs async and doesn't block the response
    c.executionCtx.waitUntil(
      (async () => {
        for (const doc of result.results) {
          // If document requires signature but has no signature request ID and status is 'assigned'
          if (doc.requires_signature === 1 && !doc.signature_request_id && doc.status === 'assigned') {
            try {
              console.log(`[AUTO-RETRY] Creating signature request for assignment ${doc.id}`);

              // Get employee details
              const employee = await env.DB.prepare(`
                SELECT bitrix_id, full_name, email
                FROM employee_cache
                WHERE bitrix_id = ?
              `).bind(session.bitrixId).first();

              if (!employee) {
                console.error(`[AUTO-RETRY] Employee ${session.bitrixId} not found in cache`);
                continue;
              }

              // Get PDF from R2
              const r2Object = await env.DOCUMENTS.get(doc.template_url);
              if (!r2Object) {
                console.error(`[AUTO-RETRY] Template file not found: ${doc.template_url}`);
                continue;
              }

              const pdfBuffer = await r2Object.arrayBuffer();

              // Parse field positions
              let fieldPositions = null;
              if (doc.field_positions) {
                try {
                  fieldPositions = JSON.parse(doc.field_positions);
                } catch (e) {
                  console.warn('[AUTO-RETRY] Failed to parse field positions:', e);
                }
              }

              // Create signature request via OpenSign
              const opensign = new OpenSignClient(env);
              const signatureRequest = await opensign.createSignatureRequestFromPDF({
                pdfBuffer,
                fileName: doc.file_name,
                documentTitle: doc.title,
                signerEmail: employee.email as string,
                signerName: employee.full_name as string,
                fieldPositions,
                metadata: {
                  employeeId: employee.bitrix_id,
                  templateId: doc.template_id,
                  assignmentId: doc.id
                }
              });

              console.log(`[AUTO-RETRY] Created OpenSign document ${signatureRequest.id}, now storing in database...`);

              // Store signature request in database with INSERT OR REPLACE to handle duplicates
              const insertResult = await env.DB.prepare(`
                INSERT OR REPLACE INTO signature_requests (
                  id, employee_id, bitrix_id, document_type, document_title, opensign_url, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
              `).bind(
                signatureRequest.id,
                doc.bitrix_id,  // employee_id from document assignment
                doc.bitrix_id,  // bitrix_id
                doc.category || 'document',  // document_type
                doc.title,
                signatureRequest.signUrl
              ).run();

              console.log(`[AUTO-RETRY] Insert result:`, insertResult.success, insertResult.meta);

              // Update assignment with signature request ID and change status to 'sent'
              const updateResult = await env.DB.prepare(`
                UPDATE document_assignments
                SET signature_request_id = ?,
                    status = 'sent',
                    notes = NULL
                WHERE id = ?
              `).bind(signatureRequest.id, doc.id).run();

              console.log(`[AUTO-RETRY] Update result:`, updateResult.success, updateResult.meta);
              console.log(`[AUTO-RETRY] Successfully created signature request for assignment ${doc.id}`);

            } catch (error) {
              console.error(`[AUTO-RETRY] Failed to create signature request for assignment ${doc.id}:`, error);
              // Update notes field with error for debugging
              await env.DB.prepare(`
                UPDATE document_assignments
                SET notes = ?
                WHERE id = ?
              `).bind(
                `Auto-retry failed: ${(error as Error).message}`,
                doc.id
              ).run();
            }
          }
        }
      })()
    );

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
    skills: 'ufCrm6Skills',
    certifications: 'ufCrm6Certifications',
    softwareExperience: 'ufCrm6SoftwareExperience',
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
