import { Hono } from 'hono';
import type { Env, DocumentAssignmentWithTemplate } from '../types';
import { verifySession } from '../lib/auth';
import { BitrixClient } from '../lib/bitrix';
import { addSignatureToPDF, type SignatureField } from '../lib/pdf-signer';
import { sendEmail, getConfirmationEmail } from '../lib/email';

export const signatureRoutes = new Hono<{ Bindings: Env }>();

/**
 * Category-to-Bitrix24 Field Mapping
 * When a document with these categories is signed, upload to the corresponding Bitrix24 field
 *
 * COMPLETE MAPPING: All 22 file fields from HR Center SPA
 * Multiple file fields: Use addFileToEmployee (appends)
 * Single file fields: Use uploadFileToEmployee (replaces)
 */
const CATEGORY_FIELD_MAP: Record<string, string> = {
  // Tax & Onboarding Documents
  'W-4': 'ufCrm_6_UF_W4_FILE', // W-4 Form (multiple)
  'I-9': 'ufCrm_6_UF_I9_FILE', // I-9 Form (multiple)
  'Multiple Jobs Worksheet': 'ufCrm6MultipleJobsWorksheet', // W-4 Multiple Jobs Worksheet (single)
  'Deductions Worksheet': 'ufCrm6DeductionsWorksheet', // W-4 Deductions Worksheet (single)

  // Legal & Compliance Documents
  'NDA': 'ufCrm6Nda', // NDA Agreement (single)
  'Non-Compete': 'ufCrm6Noncompete', // Non-Compete Agreement (single)
  'Handbook': 'ufCrm6HandbookAck', // Employee Handbook Acknowledgment (single)
  'Background Check': 'ufCrm6BackgroundCheck', // Background Check (single)
  'Drug Test': 'ufCrm6DrugTest', // Drug Test Results (multiple)
  'Hiring Paperwork': 'ufCrm6HiringPaperwork', // Hiring Paperwork (multiple)

  // Benefits & Payroll Documents
  'Direct Deposit': 'ufCrm6DirectDeposit', // Direct Deposit Authorization (single)
  '401k Enrollment': 'ufCrm_6_401K_ENROLLMENT', // 401k Enrollment (single)
  'Health Insurance': 'ufCrm6HealthInsurance', // Health Insurance Enrollment (single)

  // Identity & Verification Documents
  'Drivers License': 'ufCrm_6_UF_USR_1747966315398', // Driver's License (single)
  'Auto Insurance': 'ufCrm_6_UF_USR_1737120327618', // Automobile Insurance (single)
  'Work Visa': 'ufCrm6WorkVisa', // Work Visa/Permit (single)
  'Profile Photo': 'ufCrm6ProfilePhoto', // Profile Photo (single)

  // Training & Development Documents
  'Professional Certifications': 'ufCrm6Certifications', // Professional Certifications (multiple)
  'Training Completion': 'ufCrm6TrainingComplete', // Required Training Completion (multiple)
  'Training Documents': 'ufCrm6TrainingDocs', // Training Documents (multiple)
  'Training Records': 'ufCrm6TrainingRecords', // Training Records (multiple)
  'Skills Assessment': 'ufCrm6SkillsAssessment', // Skills Assessment (single)
};

/**
 * NATIVE SIGNATURE SYSTEM
 * OpenSign integration has been removed. All signatures use the native pdf-lib system.
 */

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

    // 1. Get assignment details (including multi-signer fields and category)
    const assignment = await env.DB.prepare(`
      SELECT da.*, dt.template_url, dt.title as template_title, dt.category
      FROM document_assignments da
      JOIN document_templates dt ON da.template_id = dt.id
      WHERE da.id = ?
    `).bind(body.assignmentId).first<any>();

    if (!assignment) {
      return c.json({ error: 'Assignment not found' }, 404);
    }

    if (assignment.status === 'signed') {
      return c.json({ error: 'Document already signed' }, 400);
    }

    // MULTI-SIGNER WORKFLOW
    if (assignment.is_multi_signer === 1) {
      console.log(`[MULTI-SIGNER] Processing signature for assignment ${body.assignmentId}`);

      // Get current signer record
      const currentSigner = await env.DB.prepare(`
        SELECT * FROM document_signers
        WHERE assignment_id = ? AND bitrix_id = ? AND signing_order = ?
      `).bind(body.assignmentId, session.bitrixId, assignment.current_signer_step).first<any>();

      if (!currentSigner) {
        return c.json({
          error: 'Unauthorized or not your turn to sign',
          details: `Current step: ${assignment.current_signer_step}, Your ID: ${session.bitrixId}`
        }, 403);
      }

      if (currentSigner.status === 'signed') {
        return c.json({ error: 'You have already signed this document' }, 400);
      }

      // Determine which PDF to use as base
      let basePdfBytes: ArrayBuffer;
      let basePdfKey: string;

      if (assignment.current_signer_step === 1) {
        // First signer: use original template
        basePdfKey = assignment.template_url.replace(/^\//, '');
        const pdfObject = await env.DOCUMENTS.get(basePdfKey);
        if (!pdfObject) {
          return c.json({ error: 'Template not found in storage' }, 404);
        }
        basePdfBytes = await pdfObject.arrayBuffer();
        console.log(`[MULTI-SIGNER] First signer - using original template: ${basePdfKey}`);
      } else {
        // Subsequent signers: use previous version
        const previousVersion = assignment.current_signer_step - 1;
        // Find previous signer
        const previousSigner = await env.DB.prepare(`
          SELECT signature_url FROM document_signers
          WHERE assignment_id = ? AND signing_order = ?
        `).bind(body.assignmentId, previousVersion).first<any>();

        if (!previousSigner || !previousSigner.signature_url) {
          return c.json({ error: 'Previous signer has not completed signing yet' }, 400);
        }

        basePdfKey = previousSigner.signature_url;
        const pdfObject = await env.DOCUMENTS.get(basePdfKey);
        if (!pdfObject) {
          return c.json({ error: 'Previous PDF version not found' }, 404);
        }
        basePdfBytes = await pdfObject.arrayBuffer();
        console.log(`[MULTI-SIGNER] Using previous version: ${basePdfKey}`);
      }

      // Convert signature data URL to PNG buffer
      const base64Data = body.signatureDataUrl.split(',')[1];
      if (!base64Data) {
        return c.json({ error: 'Invalid signature data' }, 400);
      }

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Add signature to PDF
      console.log('[MULTI-SIGNER] Adding signature to PDF:', {
        assignmentId: body.assignmentId,
        signerOrder: assignment.current_signer_step,
        bitrixId: session.bitrixId
      });

      const signedPdfBytes = await addSignatureToPDF(
        basePdfBytes,
        bytes.buffer,
        body.signatureFields
      );

      // Save versioned PDF: assignments/{id}/v{N}_signer_{bitrixId}.pdf
      const versionedKey = `assignments/${body.assignmentId}/v${assignment.current_signer_step}_signer_${session.bitrixId}.pdf`;
      await env.DOCUMENTS.put(versionedKey, signedPdfBytes, {
        httpMetadata: {
          contentType: 'application/pdf',
        },
        customMetadata: {
          assignmentId: String(body.assignmentId),
          signerBitrixId: String(session.bitrixId),
          signingOrder: String(assignment.current_signer_step),
          signedAt: new Date().toISOString(),
          version: String(assignment.current_signer_step),
        },
      });

      console.log(`[MULTI-SIGNER] Saved versioned PDF: ${versionedKey}`);

      // Update current signer record
      await env.DB.prepare(`
        UPDATE document_signers
        SET status = 'signed',
            signed_at = datetime('now'),
            signature_url = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(versionedKey, currentSigner.id).run();

      // Check if there are more signers
      const totalSigners = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM document_signers
        WHERE assignment_id = ?
      `).bind(body.assignmentId).first<any>();

      const isLastSigner = assignment.current_signer_step >= (totalSigners?.count || 0);

      if (isLastSigner) {
        // LAST SIGNER: Complete the workflow
        console.log('[MULTI-SIGNER] Last signer - completing workflow');

        // Save final PDF
        const finalKey = `assignments/${body.assignmentId}/final.pdf`;
        await env.DOCUMENTS.put(finalKey, signedPdfBytes, {
          httpMetadata: {
            contentType: 'application/pdf',
          },
          customMetadata: {
            assignmentId: String(body.assignmentId),
            completedAt: new Date().toISOString(),
            isFinal: 'true',
          },
        });

        const r2Url = `r2://hartzell-hr-templates/${finalKey}`;

        // Add timeline entry to Bitrix24 (audit trail only - PDF stored in R2)
        const bitrix = new BitrixClient(env);
        const firstSignerBitrixId = assignment.employee_id; // First signer is stored in assignment
        await bitrix.addTimelineEntry(
          firstSignerBitrixId,
          `Multi-signer document "${assignment.template_title}" completed with ${totalSigners?.count} signatures on ${new Date().toLocaleDateString()}. Signed PDF stored in R2: ${finalKey}`,
          'note'
        );

        // Category-based Bitrix24 file upload for multi-signer documents
        const bitrixField = assignment.category ? CATEGORY_FIELD_MAP[assignment.category] : null;
        if (bitrixField) {
          console.log(`[MULTI-SIGNER][CATEGORY-UPLOAD] Category "${assignment.category}" mapped to field "${bitrixField}"`);

          // Determine if multiple or single file field
          // ALL 8 multiple file fields from HR Center SPA
          const multipleFileFields = [
            'ufCrm_6_UF_W4_FILE', // W-4 Form
            'ufCrm_6_UF_I9_FILE', // I-9 Form
            'ufCrm6DrugTest', // Drug Test Results
            'ufCrm6HiringPaperwork', // Hiring Paperwork
            'ufCrm6Certifications', // Professional Certifications
            'ufCrm6TrainingComplete', // Required Training Completion
            'ufCrm6TrainingDocs', // Training Documents
            'ufCrm6TrainingRecords', // Training Records
          ];

          try {
            if (multipleFileFields.includes(bitrixField)) {
              // Use addFileToEmployee for multiple file fields (appends to existing files)
              await bitrix.addFileToEmployee(
                firstSignerBitrixId,
                `${assignment.template_title}_signed.pdf`,
                signedPdfBytes,
                bitrixField
              );
              console.log(`[MULTI-SIGNER][CATEGORY-UPLOAD] Added to multiple file field: ${bitrixField}`);
            } else {
              // Use uploadFileToEmployee for single file fields (replaces existing file)
              await bitrix.uploadFileToEmployee(
                firstSignerBitrixId,
                `${assignment.template_title}_signed.pdf`,
                signedPdfBytes,
                bitrixField
              );
              console.log(`[MULTI-SIGNER][CATEGORY-UPLOAD] Uploaded to single file field: ${bitrixField}`);
            }

            // Update timeline with upload confirmation
            await bitrix.addTimelineEntry(
              firstSignerBitrixId,
              `Multi-signer document "${assignment.template_title}" uploaded to ${assignment.category} field in Bitrix24`,
              'note'
            );
          } catch (uploadError) {
            console.error(`[MULTI-SIGNER][CATEGORY-UPLOAD] Failed to upload to Bitrix24 field "${bitrixField}":`, uploadError);
            // Don't fail the entire signing process if Bitrix24 upload fails
            // Document is still saved in R2 and timeline entry was created
          }
        } else if (assignment.category) {
          console.log(`[MULTI-SIGNER][CATEGORY-UPLOAD] Category "${assignment.category}" not mapped to any Bitrix24 field`);
        } else {
          console.log('[MULTI-SIGNER][CATEGORY-UPLOAD] No category assigned - skipping Bitrix24 file upload');
        }

        // Mark assignment as signed
        await env.DB.prepare(`
          UPDATE document_assignments
          SET status = 'signed',
              signed_at = datetime('now'),
              signed_document_url = ?
          WHERE id = ?
        `).bind(r2Url, body.assignmentId).run();

        console.log('[MULTI-SIGNER] Workflow complete:', {
          assignmentId: body.assignmentId,
          finalKey,
          r2Url
        });

        // Mark pending tasks as completed for all signers
        await env.DB.prepare(`
          UPDATE pending_tasks
          SET completed_at = datetime('now')
          WHERE related_id = ?
        `).bind(String(body.assignmentId)).run();

        // Send signature confirmation email to all signers
        try {
          const allSigners = await env.DB.prepare(`
            SELECT * FROM document_signers
            WHERE assignment_id = ?
            ORDER BY signing_order ASC
          `).bind(body.assignmentId).all();

          for (const signer of allSigners.results || []) {
            if (signer.employee_email) {
              const emailTemplate = getConfirmationEmail({
                employeeName: signer.employee_name as string,
                documentTitle: assignment.template_title,
                profileUrl: 'https://app.hartzell.work/employee/profile'
              });

              await sendEmail(env, {
                to: signer.employee_email as string,
                toName: signer.employee_name as string,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text,
                type: 'document_signed',
                employeeId: signer.bitrix_id as number
              });

              console.log(`[MULTI-SIGNER] Sent confirmation email to ${signer.employee_name}`);
            }
          }
        } catch (emailError) {
          console.error('[MULTI-SIGNER] Failed to send confirmation emails:', emailError);
          // Don't fail the entire signing process if email fails
        }

        return c.json({
          success: true,
          isMultiSigner: true,
          isLastSigner: true,
          documentUrl: finalKey,
          r2Url,
          message: 'Multi-signer document completed successfully',
        });

      } else {
        // NOT LAST SIGNER: Advance to next signer
        const nextStep = assignment.current_signer_step + 1;
        console.log(`[MULTI-SIGNER] Advancing workflow to step ${nextStep}`);

        // Increment current_signer_step
        await env.DB.prepare(`
          UPDATE document_assignments
          SET current_signer_step = ?
          WHERE id = ?
        `).bind(nextStep, body.assignmentId).run();

        // Get next signer
        const nextSigner = await env.DB.prepare(`
          SELECT * FROM document_signers
          WHERE assignment_id = ? AND signing_order = ?
        `).bind(body.assignmentId, nextStep).first<any>();

        if (nextSigner && nextSigner.employee_email) {
          // TODO: Send email notification to next signer
          // For now, just log
          console.log(`[MULTI-SIGNER] Next signer: ${nextSigner.employee_name} (${nextSigner.employee_email})`);

          // Update notified_at timestamp
          await env.DB.prepare(`
            UPDATE document_signers
            SET notified_at = datetime('now')
            WHERE id = ?
          `).bind(nextSigner.id).run();
        }

        return c.json({
          success: true,
          isMultiSigner: true,
          isLastSigner: false,
          currentStep: nextStep,
          totalSteps: totalSigners?.count || 0,
          nextSigner: nextSigner ? {
            name: nextSigner.employee_name,
            role: nextSigner.role_name
          } : null,
          message: `Signature recorded. Next signer: ${nextSigner?.employee_name || 'Unknown'}`,
        });
      }
    }

    // SINGLE-SIGNER WORKFLOW (original logic)
    console.log('[SINGLE-SIGNER] Processing signature');

    // Verify employee authorization
    if (assignment.employee_id !== session.employeeId) {
      return c.json({ error: 'Unauthorized to sign this document' }, 403);
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
    console.log('[SINGLE-SIGNER] Adding signature to PDF:', {
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

    // 7. Add timeline entry to Bitrix24 (audit trail only - PDF stored in R2)
    const bitrix = new BitrixClient(env);
    await bitrix.addTimelineEntry(
      session.bitrixId,
      `Document "${assignment.template_title}" signed electronically on ${new Date().toLocaleDateString()}. Signed PDF stored in R2: ${r2Key}`,
      'note'
    );

    // 7b. Category-based Bitrix24 file upload
    const bitrixField = assignment.category ? CATEGORY_FIELD_MAP[assignment.category] : null;
    if (bitrixField) {
      console.log(`[CATEGORY-UPLOAD] Category "${assignment.category}" mapped to field "${bitrixField}"`);

      // Determine if multiple or single file field
      // ALL 8 multiple file fields from HR Center SPA
      const multipleFileFields = [
        'ufCrm_6_UF_W4_FILE', // W-4 Form
        'ufCrm_6_UF_I9_FILE', // I-9 Form
        'ufCrm6DrugTest', // Drug Test Results
        'ufCrm6HiringPaperwork', // Hiring Paperwork
        'ufCrm6Certifications', // Professional Certifications
        'ufCrm6TrainingComplete', // Required Training Completion
        'ufCrm6TrainingDocs', // Training Documents
        'ufCrm6TrainingRecords', // Training Records
      ];

      try {
        if (multipleFileFields.includes(bitrixField)) {
          // Use addFileToEmployee for multiple file fields (appends to existing files)
          await bitrix.addFileToEmployee(
            session.bitrixId,
            `${assignment.template_title}_signed.pdf`,
            signedPdfBytes,
            bitrixField
          );
          console.log(`[CATEGORY-UPLOAD] Added to multiple file field: ${bitrixField}`);
        } else {
          // Use uploadFileToEmployee for single file fields (replaces existing file)
          await bitrix.uploadFileToEmployee(
            session.bitrixId,
            `${assignment.template_title}_signed.pdf`,
            signedPdfBytes,
            bitrixField
          );
          console.log(`[CATEGORY-UPLOAD] Uploaded to single file field: ${bitrixField}`);
        }

        // Update timeline with upload confirmation
        await bitrix.addTimelineEntry(
          session.bitrixId,
          `Signed document "${assignment.template_title}" uploaded to ${assignment.category} field in Bitrix24`,
          'note'
        );
      } catch (uploadError) {
        console.error(`[CATEGORY-UPLOAD] Failed to upload to Bitrix24 field "${bitrixField}":`, uploadError);
        // Don't fail the entire signing process if Bitrix24 upload fails
        // Document is still saved in R2 and timeline entry was created
      }
    } else if (assignment.category) {
      console.log(`[CATEGORY-UPLOAD] Category "${assignment.category}" not mapped to any Bitrix24 field`);
    } else {
      console.log('[CATEGORY-UPLOAD] No category assigned - skipping Bitrix24 file upload');
    }

    // 8. Update assignment status in D1
    await env.DB.prepare(`
      UPDATE document_assignments
      SET status = 'signed',
          signed_at = datetime('now'),
          signed_document_url = ?
      WHERE id = ?
    `).bind(r2Url, body.assignmentId).run();

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

    console.log('[SINGLE-SIGNER] Document signed successfully:', {
      assignmentId: body.assignmentId,
      r2Key,
      r2Url
    });

    // 12. Send signature confirmation email
    try {
      // Get employee details from cache
      const cachedEmployee = await env.EMPLOYEE_CACHE.get(`employee_${session.bitrixId}`, 'json') as any;

      if (cachedEmployee && cachedEmployee.email) {
        const emailTemplate = getConfirmationEmail({
          employeeName: cachedEmployee.full_name || cachedEmployee.name || 'Employee',
          documentTitle: assignment.template_title,
          profileUrl: 'https://app.hartzell.work/employee/profile'
        });

        await sendEmail(env, {
          to: cachedEmployee.email,
          toName: cachedEmployee.full_name || cachedEmployee.name || 'Employee',
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          type: 'document_signed',
          employeeId: session.employeeId
        });

        console.log('[SINGLE-SIGNER] Sent confirmation email to', cachedEmployee.email);
      } else {
        console.log('[SINGLE-SIGNER] No employee email found in cache, skipping confirmation email');
      }
    } catch (emailError) {
      console.error('[SINGLE-SIGNER] Failed to send confirmation email:', emailError);
      // Don't fail the entire signing process if email fails
    }

    // 13. Return success
    return c.json({
      success: true,
      isMultiSigner: false,
      documentUrl: r2Key,
      r2Url,
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

