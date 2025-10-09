import { Hono } from 'hono';
import type { Env, DocumentAssignmentWithTemplate, DocumentAssignment } from '../types';
import { verifySession } from '../lib/auth';
import { OpenSignClient } from '../lib/opensign';
import { BitrixClient } from '../lib/bitrix';
import { addSignatureToPDF, type SignatureField } from '../lib/pdf-signer';

export const signatureRoutes = new Hono<{ Bindings: Env }>();

// Get pending signatures
signatureRoutes.get('/pending', async (c) => {
  const env = c.env;

  // Verify session
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

  // TODO: Query D1 for pending signature requests for this employee
  // For now, return empty array
  return c.json([]);
});

// Create signature request
signatureRoutes.post('/create', async (c) => {
  const env = c.env;

  // Verify session
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

  const body = await c.req.json<{
    documentType: string;
    documentTitle: string;
  }>();

  try {
    // Generate unique request ID
    const requestId = crypto.randomUUID();

    // TODO: Create signature request in OpenSign
    // For now, create a placeholder in the database
    await env.DB.prepare(`
      INSERT INTO signature_requests (
        id, employee_id, bitrix_id, document_type, document_title,
        status, created_at
      )
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `)
      .bind(
        requestId,
        session.employeeId,
        session.bitrixId,
        body.documentType,
        body.documentTitle
      )
      .run();

    // Construct OpenSign URL (sandbox or production based on env)
    const opensignBaseUrl = env.OPENSIGN_ENV === 'production'
      ? 'https://app.opensignlabs.com'
      : 'https://app.opensignlabs.com'; // Update with sandbox URL if different

    const signatureUrl = `${opensignBaseUrl}/sign/${requestId}`;

    return c.json({
      requestId,
      signatureUrl
    });

  } catch (error) {
    console.error('Failed to create signature request:', error);
    return c.json({ error: 'Failed to create signature request' }, 500);
  }
});

// Get signature URL
signatureRoutes.get('/:id/url', async (c) => {
  const env = c.env;
  const id = c.req.param('id');

  // Verify session
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

  // TODO: Verify this signature request belongs to the employee
  return c.json({ url: `https://app.opensignlabs.com/sign/${id}` });
});

/**
 * Native PDF signing endpoint using pdf-lib
 * Replaces OpenSign for white-label signature capture
 */
signatureRoutes.post('/sign-native', async (c) => {
  const env = c.env;

  // Verify session
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
    const body = await c.req.json<{
      assignmentId: number;
      signatureDataUrl: string;
      signatureFields: SignatureField[];
    }>();

    // 1. Get assignment details
    const assignment = await env.DB.prepare(`
      SELECT da.*, dt.template_url, dt.title as template_title
      FROM document_assignments da
      JOIN document_templates dt ON da.template_id = dt.id
      WHERE da.id = ? AND da.employee_id = ?
    `).bind(body.assignmentId, session.employeeId).first<DocumentAssignmentWithTemplate>();

    if (!assignment) {
      return c.json({ error: 'Assignment not found or unauthorized' }, 404);
    }

    if (assignment.status === 'signed') {
      return c.json({ error: 'Document already signed' }, 400);
    }

    // 2. Fetch original PDF from R2
    const pdfKey = assignment.template_url.replace(/^\//, '');
    const pdfObject = await env.DOCUMENTS.get(pdfKey);

    if (!pdfObject) {
      return c.json({ error: 'Template not found in storage' }, 404);
    }

    const pdfBytes = await pdfObject.arrayBuffer();

    // 3. Convert signature data URL to PNG buffer
    const base64Data = body.signatureDataUrl.split(',')[1];
    if (!base64Data) {
      return c.json({ error: 'Invalid signature data' }, 400);
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 4. Add signature to PDF using pdf-lib
    console.log('[NATIVE SIGN] Adding signature to PDF:', {
      assignmentId: body.assignmentId,
      employeeId: session.employeeId,
      fieldsCount: body.signatureFields.length
    });

    const signedPdfBytes = await addSignatureToPDF(
      pdfBytes,
      bytes.buffer,
      body.signatureFields
    );

    // 5. Generate unique filename
    const timestamp = Date.now();
    const fileName = `signed_${assignment.template_id}_${assignment.employee_id}_${timestamp}.pdf`;
    const r2Key = `signed-documents/${session.bitrixId}/${fileName}`;

    // 6. Upload signed PDF to R2
    await env.DOCUMENTS.put(r2Key, signedPdfBytes, {
      httpMetadata: {
        contentType: 'application/pdf',
      },
      customMetadata: {
        assignmentId: String(body.assignmentId),
        employeeId: String(session.employeeId),
        bitrixId: String(session.bitrixId),
        signedAt: new Date().toISOString(),
      },
    });

    const r2Url = `r2://hartzell-hr-templates/${r2Key}`;

    // 7. Upload signed PDF to Bitrix24
    const bitrix = new BitrixClient(env);
    const bitrixFileId = await bitrix.uploadFileToEmployee(
      session.bitrixId,
      `${assignment.template_title}_signed.pdf`,
      signedPdfBytes
    );

    // 8. Add timeline entry in Bitrix24
    await bitrix.addTimelineEntry(
      session.bitrixId,
      `Document "${assignment.template_title}" signed electronically on ${new Date().toLocaleDateString()}`,
      'note'
    );

    // 9. Update assignment status in D1
    await env.DB.prepare(`
      UPDATE document_assignments
      SET status = 'signed',
          signed_at = datetime('now'),
          signed_document_url = ?,
          bitrix_file_id = ?
      WHERE id = ?
    `).bind(r2Url, bitrixFileId, body.assignmentId).run();

    // 10. Mark pending task as completed (if exists)
    await env.DB.prepare(`
      UPDATE pending_tasks
      SET completed_at = datetime('now')
      WHERE employee_id = ? AND related_id = ?
    `).bind(session.employeeId, String(body.assignmentId)).run();

    // 11. Log audit event
    await env.DB.prepare(`
      INSERT INTO audit_logs (employee_id, bitrix_id, badge_number, action, status, metadata)
      VALUES (?, ?, ?, 'document.signed', 'success', ?)
    `).bind(
      session.employeeId,
      session.bitrixId,
      session.badgeNumber,
      JSON.stringify({
        assignmentId: body.assignmentId,
        documentTitle: assignment.template_title,
        signedUrl: r2Key,
        method: 'native-pdf-lib'
      })
    ).run();

    console.log('[NATIVE SIGN] Document signed successfully:', {
      assignmentId: body.assignmentId,
      r2Key,
      bitrixFileId
    });

    // 12. Return success
    return c.json({
      success: true,
      documentUrl: r2Key,
      bitrixFileId,
      message: 'Document signed successfully',
    });

  } catch (error) {
    console.error('[NATIVE SIGN] Error:', error);

    // Log error to audit
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (employee_id, bitrix_id, badge_number, action, status, metadata)
        VALUES (?, ?, ?, 'document.sign_failed', 'failure', ?)
      `).bind(
        session.employeeId,
        session.bitrixId,
        session.badgeNumber,
        JSON.stringify({
          error: (error as Error).message
        })
      ).run();
    } catch {
      // Ignore audit log errors
    }

    return c.json({
      error: 'Failed to sign document',
      message: (error as Error).message
    }, 500);
  }
});

/**
 * Verify OpenSign webhook signature using HMAC-SHA256
 */
async function verifyWebhookSignature(
  body: string,
  signature: string | undefined | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch {
    return false;
  }
}

// OpenSign webhook handler
signatureRoutes.post('/webhooks/opensign', async (c) => {
  const env = c.env;

  // Get webhook signature from header
  const signature = c.req.header('X-OpenSign-Signature');
  const body = await c.req.text();

  // Verify webhook signature
  const webhookSecret = env.OPENSIGN_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('OPENSIGN_WEBHOOK_SECRET not configured');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
  if (!isValid) {
    console.error('Invalid webhook signature');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  try {
    const event = JSON.parse(body);

    // Log webhook event (sanitized)
    await env.DB.prepare(`
      INSERT INTO audit_logs (action, status, metadata)
      VALUES (?, ?, ?)
    `)
      .bind(
        'opensign_webhook_received',
        'success',
        JSON.stringify({
          event: event.event,
          timestamp: event.timestamp,
          requestId: event.signatureRequest?.id
        })
      )
      .run();

    // Handle different webhook events
    switch (event.event) {
      case 'signature_request.signed':
        await handleSignatureCompleted(env, event);
        break;

      case 'signature_request.declined':
        await handleSignatureDeclined(env, event);
        break;

      case 'signature_request.expired':
        await handleSignatureExpired(env, event);
        break;

      default:
        console.warn('Unknown webhook event:', event.event);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', (error as Error).message);
    return c.json({ error: 'Failed to process webhook' }, 500);
  }
});

/**
 * Handle completed signature - download, store, and update records
 */
async function handleSignatureCompleted(env: Env, event: any): Promise<void> {
  const requestId = event.signatureRequest?.id;
  if (!requestId) return;

  console.log('[SIGNATURE COMPLETE] Processing:', requestId);

  try {
    // 1. Get assignment details from database
    const assignment = await env.DB.prepare(`
      SELECT * FROM document_assignments WHERE signature_request_id = ?
    `).bind(requestId).first<DocumentAssignment>();

    if (!assignment) {
      console.warn('[SIGNATURE COMPLETE] No assignment found for request:', requestId);
      return;
    }

    // 2. Download signed PDF from OpenSign
    const opensign = new OpenSignClient(env);
    const signedPdf = await opensign.downloadSignedDocument(requestId);

    // 3. Upload to R2 storage
    const fileName = `signed_${assignment.template_id}_${assignment.employee_id}_${Date.now()}.pdf`;
    const r2Key = `signed-documents/${assignment.bitrix_id}/${fileName}`;

    await env.DOCUMENTS.put(r2Key, signedPdf, {
      httpMetadata: {
        contentType: 'application/pdf'
      },
      customMetadata: {
        employeeId: assignment.employee_id.toString(),
        bitrixId: assignment.bitrix_id.toString(),
        assignmentId: assignment.id.toString(),
        signatureRequestId: requestId
      }
    });

    const r2Url = `r2://hartzell-hr-templates/${r2Key}`;

    // 4. Upload to Bitrix24 and attach to employee record
    const bitrix = new BitrixClient(env);
    const bitrixFileId = await bitrix.uploadFileToEmployee(
      assignment.bitrix_id,
      fileName,
      signedPdf
    );

    // 5. Add timeline entry to Bitrix24
    await bitrix.addTimelineEntry(
      assignment.bitrix_id,
      `Document signed: ${assignment.template_title || 'Unknown Document'} on ${new Date().toLocaleDateString()}`
    );

    // 6. Update assignment status in database
    await env.DB.prepare(`
      UPDATE document_assignments
      SET status = 'signed',
          signed_at = datetime('now'),
          signed_document_url = ?,
          bitrix_file_id = ?
      WHERE id = ?
    `)
      .bind(r2Url, bitrixFileId, assignment.id)
      .run();

    // 7. Update signature request status
    await env.DB.prepare(`
      UPDATE signature_requests
      SET status = 'signed', signed_at = datetime('now')
      WHERE id = ?
    `)
      .bind(requestId)
      .run();

    // 8. Mark pending task as completed
    await env.DB.prepare(`
      UPDATE pending_tasks
      SET completed_at = datetime('now')
      WHERE related_id = ? AND employee_id = ?
    `)
      .bind(requestId, assignment.employee_id)
      .run();

    console.log('[SIGNATURE COMPLETE] Successfully processed:', requestId);

  } catch (error) {
    console.error('[SIGNATURE COMPLETE] Error processing:', error);
    throw error;
  }
}

/**
 * Handle declined signature
 */
async function handleSignatureDeclined(env: Env, event: any): Promise<void> {
  const requestId = event.signatureRequest?.id;
  if (!requestId) return;

  console.log('[SIGNATURE DECLINED] Processing:', requestId);

  await env.DB.prepare(`
    UPDATE document_assignments
    SET status = 'declined'
    WHERE signature_request_id = ?
  `)
    .bind(requestId)
    .run();

  await env.DB.prepare(`
    UPDATE signature_requests
    SET status = 'declined'
    WHERE id = ?
  `)
    .bind(requestId)
    .run();
}

/**
 * Handle expired signature request
 */
async function handleSignatureExpired(env: Env, event: any): Promise<void> {
  const requestId = event.signatureRequest?.id;
  if (!requestId) return;

  console.log('[SIGNATURE EXPIRED] Processing:', requestId);

  await env.DB.prepare(`
    UPDATE document_assignments
    SET status = 'expired'
    WHERE signature_request_id = ?
  `)
    .bind(requestId)
    .run();

  await env.DB.prepare(`
    UPDATE signature_requests
    SET status = 'expired', expired_at = datetime('now')
    WHERE id = ?
  `)
    .bind(requestId)
    .run();
}
