import { Hono } from 'hono';
import type { Env } from '../types';

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

    const turnstileResult = await turnstileResponse.json() as any;

    if (!turnstileResult.success) {
      return c.json({ error: 'CAPTCHA verification failed' }, 400);
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
        currentEmployer: data.currentEmployer,
        currentPosition: data.currentPosition,
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
        howDidYouHear: data.howDidYouHear,
        additionalInfo: data.additionalInfo,
        resumeUrl,
        coverLetterUrl,
        submittedAt: new Date().toISOString()
      })
    };

    // Create Bitrix24 item
    const bitrixUrl = `${env.BITRIX24_WEBHOOK_URL}/crm.item.add`;
    const bitrixResponse = await fetch(bitrixUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        entityTypeId: env.BITRIX24_ENTITY_TYPE_ID,
        fields: JSON.stringify(bitrixData)
      }),
    });

    const bitrixResult = await bitrixResponse.json() as any;

    if (!bitrixResult.result) {
      console.error('Bitrix24 error:', bitrixResult);
      throw new Error('Failed to create applicant record in Bitrix24');
    }

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
        bitrixResult.result.item.id,
        data.firstName,
        data.lastName,
        data.email,
        data.phone.replace(/\D/g, ''),
        data.position === 'Other' ? data.positionOther : data.position,
        'submitted',
        resumeUrl,
        coverLetterUrl,
        JSON.stringify(data)
      )
      .run();

    // Log to audit trail
    await env.DB.prepare(`
      INSERT INTO audit_logs (action, status, metadata, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `)
      .bind(
        'application_submitted',
        'success',
        JSON.stringify({
          applicationId,
          bitrixId: bitrixResult.result.item.id,
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
    console.error('Application submission error:', error);

    // Log error to audit trail
    await env.DB.prepare(`
      INSERT INTO audit_logs (action, status, metadata, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `)
      .bind(
        'application_submission_failed',
        'failure',
        JSON.stringify({ error: error.message })
      )
      .run();

    return c.json({
      success: false,
      error: 'Failed to submit application. Please try again.'
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
