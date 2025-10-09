import { Hono } from 'hono';
import type { Env } from '../types';
import { BitrixClient } from '../lib/bitrix';
import { sanitizeForLogging, redactApplicationData } from '../lib/pii';

export const applicationRoutes = new Hono<{ Bindings: Env }>();

// Submit job application
applicationRoutes.post('/submit', async (c) => {
  const env = c.env;

  try {
    const formData = await c.req.formData();
    const dataJson = formData.get('data') as string;
    const resumeFile = formData.get('resume') as File | null;
    const coverLetterFile = formData.get('coverLetter') as File | null;

    if (!dataJson) {
      return c.json({ error: 'Missing application data' }, 400);
    }

    const data = JSON.parse(dataJson);

    // Verify Turnstile token
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: data.turnstileToken,
      }),
    });

    if (!turnstileResponse.ok) {
      console.error('Turnstile API error:', {
        status: turnstileResponse.status,
        statusText: turnstileResponse.statusText
      });
      return c.json({
        error: 'CAPTCHA verification service unavailable',
        details: `Turnstile returned ${turnstileResponse.status}`
      }, 500);
    }

    const turnstileResult = await turnstileResponse.json() as any;

    if (!turnstileResult.success) {
      console.error('Turnstile verification failed:', turnstileResult);
      return c.json({
        error: 'CAPTCHA verification failed',
        details: turnstileResult['error-codes']
      }, 400);
    }

    // Generate unique application ID
    const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Upload resume to R2
    let resumeUrl = '';
    if (resumeFile) {
      const resumeKey = `applications/${applicationId}/resume-${resumeFile.name}`;
      await env.DOCUMENTS.put(resumeKey, resumeFile.stream(), {
        httpMetadata: {
          contentType: resumeFile.type,
        },
      });
      resumeUrl = resumeKey;
    }

    // Upload cover letter to R2 (if provided)
    let coverLetterUrl = '';
    if (coverLetterFile) {
      const coverLetterKey = `applications/${applicationId}/cover-letter-${coverLetterFile.name}`;
      await env.DOCUMENTS.put(coverLetterKey, coverLetterFile.stream(), {
        httpMetadata: {
          contentType: coverLetterFile.type,
        },
      });
      coverLetterUrl = coverLetterKey;
    }

    // Create applicant record in Bitrix24
    const bitrix = new BitrixClient(env);

    const bitrixData = {
      title: `${data.firstName} ${data.lastName} - ${data.position}`,
      ufCrm6Name: data.firstName,
      ufCrm6SecondName: data.middleName || '',
      ufCrm6LastName: data.lastName,
      ufCrm6Email: [data.email],
      ufCrm6PersonalMobile: [data.phone.replace(/\D/g, '')],
      ufCrm6WorkPosition: data.position === 'Other' ? data.positionOther : data.position,
      ufCrm6UfLegalAddress: `${data.addressLine1}${data.addressLine2 ? ' ' + data.addressLine2 : ''}, ${data.city}, ${data.state} ${data.zipCode}`,

      // Additional fields as custom text
      ufCrm6AdditionalInfo: JSON.stringify({
        applicationId,
        employmentType: data.employmentType,
        shift: data.shift,
        desiredSalary: data.desiredSalary,
        availableStartDate: data.availableStartDate,
        willingToRelocate: data.willingToRelocate,
        hasWorkExperience: data.hasWorkExperience,
        workExperiences: data.workExperiences || [],
        yearsExperience: data.yearsExperience,
        educationLevel: data.educationLevel,
        schoolName: data.schoolName,
        graduationYear: data.graduationYear,
        fieldOfStudy: data.fieldOfStudy,
        skills: data.skills,
        certifications: data.certifications,
        softwareExperience: data.softwareExperience,
        reference1: {
          name: data.reference1Name,
          phone: data.reference1Phone,
          relationship: data.reference1Relationship
        },
        reference2: {
          name: data.reference2Name,
          phone: data.reference2Phone,
          relationship: data.reference2Relationship
        },
        authorizedToWork: data.authorizedToWork,
        requiresSponsorship: data.requiresSponsorship,
        over18: data.over18,
        felonyConviction: data.felonyConviction,
        felonyExplanation: data.felonyExplanation,
        backgroundCheckConsent: data.backgroundCheckConsent,
        emailConsentGiven: data.emailConsentGiven,
        howDidYouHear: data.howDidYouHear,
        additionalInfo: data.additionalInfo,
        resumeUrl,
        coverLetterUrl,
        submittedAt: new Date().toISOString()
      })
    };

    // Create Bitrix24 item using BitrixClient
    let bitrixResult;
    try {
      bitrixResult = await bitrix.createItem(bitrixData);

      if (!bitrixResult) {
        throw new Error('Bitrix returned empty result');
      }
    } catch (bitrixError: any) {
      console.error('Bitrix24 API call failed:', {
        error: bitrixError.message,
        stack: bitrixError.stack
      });
      throw new Error(`Bitrix24 integration error: ${bitrixError.message}`);
    }

    // Redact sensitive PII before storing in D1
    const redactedData = redactApplicationData(data);

    // Store application in D1 for quick access
    await env.DB.prepare(`
      INSERT INTO applications (
        application_id, bitrix_id, first_name, last_name, email, phone,
        position, status, resume_url, cover_letter_url, data, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        applicationId,
        bitrixResult.id,
        data.firstName,
        data.lastName,
        data.email,
        data.phone.replace(/\D/g, ''),
        data.position === 'Other' ? data.positionOther : data.position,
        'submitted',
        resumeUrl,
        coverLetterUrl,
        JSON.stringify(redactedData) // Store redacted data only
      )
      .run();

    // Log to audit trail
    await env.DB.prepare(`
      INSERT INTO audit_logs (action, status, metadata)
      VALUES (?, ?, ?)
    `)
      .bind(
        'application_submitted',
        'success',
        JSON.stringify({
          applicationId,
          bitrixId: bitrixResult.id,
          applicantName: `${data.firstName} ${data.lastName}`,
          position: data.position
        })
      )
      .run();

    return c.json({
      success: true,
      applicationId,
      message: 'Application submitted successfully'
    });

  } catch (error: any) {
    // Sanitize error before logging (avoid PII leakage)
    console.error('Application submission error:', {
      message: error.message || error,
      stack: error.stack,
      name: error.name
    });

    // Log error to audit trail (sanitized)
    try {
      await env.DB.prepare(`
        INSERT INTO audit_logs (action, status, metadata)
        VALUES (?, ?, ?)
      `)
        .bind(
          'application_submission_failed',
          'failure',
          JSON.stringify({
            error: error.message || 'Unknown error',
            errorType: error.name
          })
        )
        .run();
    } catch (logError) {
      console.error('Failed to log error:', (logError as Error).message);
    }

    // Return detailed error for debugging (will be generic in production)
    return c.json({
      success: false,
      error: 'Failed to submit application. Please try again.',
      details: error.message // Helps identify Bitrix vs Turnstile failures
    }, 500);
  }
});

// Get application status (for applicants to check)
applicationRoutes.get('/status/:id', async (c) => {
  const env = c.env;
  const applicationId = c.req.param('id');

  const result = await env.DB.prepare(`
    SELECT application_id, first_name, last_name, position, status, created_at
    FROM applications
    WHERE application_id = ?
  `)
    .bind(applicationId)
    .first();

  if (!result) {
    return c.json({ error: 'Application not found' }, 404);
  }

  return c.json({
    applicationId: result.application_id,
    applicantName: `${result.first_name} ${result.last_name}`,
    position: result.position,
    status: result.status,
    submittedAt: result.created_at
  });
});
