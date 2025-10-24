import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { BitrixClient } from '../lib/bitrix';
import { sendEmail, getApplicationReceivedEmail, getApplicationConfirmationEmail } from '../lib/email';
import { sanitizeForLogging, redactApplicationData } from '../lib/pii';

// Validation schemas
const WorkExperienceSchema = z.object({
  employer: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().max(1000).optional()
});

const ApplicationSchema = z.object({
  // Personal Information (Required)
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  middleName: z.string().max(50).optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email format').max(100),
  phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format XXX-XXX-XXXX'),
  addressLine1: z.string().min(1, 'Address is required').max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}$/, 'ZIP code must be 5 digits'),

  // Position Information (Required)
  position: z.string().min(1, 'Position is required').max(100),
  positionOther: z.string().max(100).optional(),
  desiredSalary: z.string().max(50).optional(),
  availableStartDate: z.string().min(1, 'Start date is required'),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Temporary']),
  shift: z.enum(['Day', 'Night', 'Swing', 'Flexible']),
  willingToRelocate: z.enum(['yes', 'no']),

  // Work Experience
  hasWorkExperience: z.enum(['yes', 'no']),
  yearsExperience: z.string().max(20).optional(),
  workExperiences: z.array(WorkExperienceSchema).optional(),

  // Education (Required)
  educationLevel: z.string().min(1, 'Education level is required').max(100),
  schoolName: z.string().max(200).optional(),
  graduationYear: z.string().max(4).optional(),
  fieldOfStudy: z.string().max(200).optional(),

  // Skills & Certifications (accept both array and string for backwards compatibility)
  skills: z.union([z.array(z.string()), z.string()]).optional().transform(val => {
    if (Array.isArray(val)) return val.join(', ');
    return val || '';
  }),
  certifications: z.union([z.array(z.string()), z.string()]).optional().transform(val => {
    if (Array.isArray(val)) return val.join(', ');
    return val || '';
  }),
  softwareExperience: z.union([z.array(z.string()), z.string()]).optional().transform(val => {
    if (Array.isArray(val)) return val.join(', ');
    return val || '';
  }),

  // References (dynamic array)
  references: z.array(z.object({
    name: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    relationship: z.string().max(100).optional()
  })).optional(),
  // Legacy fields for backwards compatibility
  reference1Name: z.string().max(100).optional(),
  reference1Phone: z.string().max(20).optional(),
  reference1Relationship: z.string().max(100).optional(),
  reference2Name: z.string().max(100).optional(),
  reference2Phone: z.string().max(20).optional(),
  reference2Relationship: z.string().max(100).optional(),

  // Legal (Required)
  authorizedToWork: z.enum(['yes', 'no']),
  requiresSponsorship: z.enum(['yes', 'no']),
  over18: z.enum(['yes', 'no']),
  backgroundCheckConsent: z.enum(['yes', '']).refine(val => val === 'yes', 'Background check consent is required'),
  felonyConviction: z.enum(['yes', 'no']),
  felonyExplanation: z.string().max(1000).optional(),

  // Additional
  howDidYouHear: z.string().max(100).optional(),
  additionalInfo: z.string().max(2000).optional(),
  emailConsentGiven: z.boolean().refine(val => val === true, 'Email consent is required'),

  // CAPTCHA token
  turnstileToken: z.string().min(1, 'CAPTCHA verification required')
});

/**
 * Sanitize user input to prevent XSS attacks
 * Removes/escapes potentially dangerous characters
 */
function sanitizeInput(input: string): string {
  if (!input) return input;

  // Remove script tags and potentially dangerous HTML
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers like onclick=

  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitize all string fields in application data
 */
function sanitizeApplicationData(data: any): any {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: any) =>
        typeof item === 'object' ? sanitizeApplicationData(item) :
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeApplicationData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const applicationRoutes = new Hono<{ Bindings: Env }>();

// Submit job application
applicationRoutes.post('/submit', async (c) => {
  const env = c.env;

  try {
    // Rate limiting: Max 3 submissions per email per hour
    const formData = await c.req.formData();
    const dataJson = formData.get('data') as string;
    const resumeFile = formData.get('resume') as File | null;
    const coverLetterFile = formData.get('coverLetter') as File | null;

    if (!dataJson) {
      return c.json({ error: 'Missing application data' }, 400);
    }

    // Parse JSON data
    let data;
    try {
      data = JSON.parse(dataJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return c.json({ error: 'Invalid JSON data' }, 400);
    }

    // Validate file sizes (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

    if (resumeFile && resumeFile.size > MAX_FILE_SIZE) {
      return c.json({
        error: 'File size validation failed',
        details: 'Resume file must be less than 5MB'
      }, 400);
    }

    if (coverLetterFile && coverLetterFile.size > MAX_FILE_SIZE) {
      return c.json({
        error: 'File size validation failed',
        details: 'Cover letter file must be less than 5MB'
      }, 400);
    }

    // Validate file types
    const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (resumeFile && !ALLOWED_TYPES.includes(resumeFile.type)) {
      return c.json({
        error: 'File type validation failed',
        details: 'Resume must be PDF, DOC, or DOCX'
      }, 400);
    }

    if (coverLetterFile && !ALLOWED_TYPES.includes(coverLetterFile.type)) {
      return c.json({
        error: 'File type validation failed',
        details: 'Cover letter must be PDF, DOC, or DOCX'
      }, 400);
    }

    // Validate application data using Zod schema
    let validatedData;
    try {
      validatedData = ApplicationSchema.parse(data);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation error:', validationError.errors);
        return c.json({
          error: 'Application data validation failed',
          details: validationError.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, 400);
      }
      throw validationError;
    }

    // Sanitize all string inputs to prevent XSS
    const sanitizedData = sanitizeApplicationData(validatedData);

    // Use sanitized data from this point forward
    data = sanitizedData;

    // Rate limiting check (3 submissions per email per hour)
    const rateLimitKey = `application_${data.email}`;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const recentSubmissions = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM applications
      WHERE email = ? AND created_at > ?
    `).bind(data.email, oneHourAgo).first();

    if (recentSubmissions && (recentSubmissions.count as number) >= 3) {
      console.warn(`Rate limit exceeded for email: ${data.email}`);
      return c.json({
        error: 'Rate limit exceeded',
        details: 'You can only submit 3 applications per hour. Please try again later.'
      }, 429);
    }

    // Verify Turnstile token (with test bypass)
    const isTestToken = data.turnstileToken === 'AUTOMATED_TEST_BYPASS_TOKEN_DO_NOT_USE_IN_PRODUCTION';

    if (!isTestToken) {
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
    } else {
      console.warn('⚠️  TEST MODE: CAPTCHA bypass used');
    }

    // Generate unique application ID and verification token
    const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const verificationToken = crypto.randomUUID();

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

    // Redact sensitive PII before storing in D1
    const redactedData = redactApplicationData(data);

    // Store application in D1 as PENDING (will be confirmed via email)
    // Bitrix24 item will be created AFTER email verification
    await env.DB.prepare(`
      INSERT INTO applications (
        application_id, first_name, last_name, email, phone,
        position, status, resume_url, cover_letter_url, data,
        verification_token, email_verified, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        applicationId,
        data.firstName,
        data.lastName,
        data.email,
        data.phone.replace(/\D/g, ''),
        data.position === 'Other' ? data.positionOther : data.position,
        'pending', // Status is pending until email verified
        resumeUrl,
        coverLetterUrl,
        JSON.stringify(redactedData), // Store redacted data only
        verificationToken,
        0 // email_verified = false
      )
      .run();

    // Log to audit trail
    await env.DB.prepare(`
      INSERT INTO audit_logs (action, status, metadata)
      VALUES (?, ?, ?)
    `)
      .bind(
        'application_pending_verification',
        'success',
        JSON.stringify({
          applicationId,
          applicantName: `${data.firstName} ${data.lastName}`,
          position: data.position,
          email: data.email
        })
      )
      .run();

    // Send confirmation email with magic link
    try {
      const confirmUrl = `https://app.hartzell.work/verify?token=${verificationToken}`;

      const emailTemplate = getApplicationConfirmationEmail({
        employeeName: `${data.firstName} ${data.lastName}`,
        confirmUrl
      });

      await sendEmail(env, {
        to: data.email,
        toName: `${data.firstName} ${data.lastName}`,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        type: 'application_confirmation'
      });

      console.log(`[Application] Confirmation email sent to ${data.email} with token ${verificationToken}`);
    } catch (emailError) {
      // Don't fail the entire request if email fails
      console.error('[Application] Failed to send confirmation email:', emailError);
      // Email failure is logged in email.ts, so we just continue
    }

    return c.json({
      success: true,
      applicationId,
      message: 'Application received! Please check your email to confirm your submission.',
      requiresEmailConfirmation: true
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

// Verify email and complete application submission
applicationRoutes.get('/verify/:token', async (c) => {
  const env = c.env;
  const token = c.req.param('token');

  try {
    // Look up application by verification token
    const application = await env.DB.prepare(`
      SELECT * FROM applications
      WHERE verification_token = ?
    `)
      .bind(token)
      .first();

    if (!application) {
      return c.json({
        success: false,
        error: 'Invalid verification link',
        message: 'This verification link is invalid or has expired.'
      }, 404);
    }

    // Check if already verified
    if (application.email_verified === 1) {
      return c.json({
        success: true,
        alreadyVerified: true,
        applicationId: application.application_id,
        message: 'Your email has already been verified. Your application has been submitted.'
      });
    }

    // Parse application data
    const data = JSON.parse(application.data as string);

    // Create Bitrix24 item now that email is verified
    const bitrix = new BitrixClient(env);

    // Format references for Bitrix24 text field
    const referencesData = data.references || [
      {
        name: data.reference1Name,
        phone: data.reference1Phone,
        relationship: data.reference1Relationship
      },
      {
        name: data.reference2Name,
        phone: data.reference2Phone,
        relationship: data.reference2Relationship
      }
    ].filter((ref: any) => ref.name);

    const formattedReferences = referencesData
      .map((ref: any, i: number) => `Reference ${i + 1}: ${ref.name} - ${ref.phone} (${ref.relationship})`)
      .join('\n');

    // Map enum fields to their Bitrix24 enum IDs
    let workAuthEnumId: number | undefined;
    if (data.authorizedToWork === 'no' || data.requiresSponsorship === 'yes') {
      workAuthEnumId = 2216; // Require Sponsorship
    } else if (data.authorizedToWork === 'yes') {
      workAuthEnumId = 2213; // US Citizen
    }

    const shiftMap: Record<string, number> = {
      'Day': 2221,
      'Night': 2222,
      'Swing': 2223,
      'Flexible': 2224
    };
    const shiftEnumId = data.shift ? shiftMap[data.shift] : undefined;

    const employmentTypeMap: Record<string, number> = {
      'Full-time': 2030,
      'Part-time': 2031,
      'Contract': 2032,
      'Temporary': 2033
    };
    const employmentTypeEnumId = data.employmentType ? employmentTypeMap[data.employmentType] : undefined;

    const decodeHtmlEntities = (str: string): string => {
      if (!str) return str;
      return str
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    };

    const educationMap: Record<string, number> = {
      'High School Diploma': 2206,
      'High School Diploma/GED': 2206,
      'High School': 2206,
      'Some College': 2207,
      'Associate Degree': 2208,
      'Associate': 2208,
      "Associate's Degree": 2208,
      'Bachelor Degree': 2209,
      'Bachelor': 2209,
      "Bachelor's Degree": 2209,
      "Bachelors Degree": 2209,
      'Master Degree': 2210,
      'Master': 2210,
      "Master's Degree": 2210,
      "Masters Degree": 2210,
      'Doctorate': 2211,
      'PhD': 2211,
      'Trade Certificate': 2212,
      'Trade Certification': 2212,
      'Trade/Vocational Certificate': 2212,
      'Vocational': 2212
    };

    const decodedEducationLevel = decodeHtmlEntities(data.educationLevel || '');
    const educationEnumId = decodedEducationLevel ? educationMap[decodedEducationLevel] : undefined;

    // Format phone number as XXX-XXX-XXXX
    const formatPhone = (phone: string): string => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return digits; // Return raw digits if not 10 digits
    };

    // Format work experiences for Employment History field
    const formatEmploymentHistory = (experiences: any[]): string => {
      if (!experiences || experiences.length === 0) {
        return '';
      }

      return experiences.map((exp) => {
        const lines: string[] = [];

        if (exp.employer) {
          lines.push(`Company: ${exp.employer}`);
        }

        if (exp.position) {
          lines.push(`Position: ${exp.position}`);
        }

        if (exp.startDate || exp.endDate || exp.current) {
          const start = exp.startDate || 'Unknown';
          const end = exp.current ? 'Present' : (exp.endDate || 'Unknown');
          lines.push(`Period: ${start} - ${end}`);
        }

        if (exp.description) {
          lines.push(`Responsibilities: ${exp.description}`);
        }

        return lines.join('\n');
      }).join('\n\n---\n\n');
    };

    const bitrixData = {
      title: `${data.firstName} ${data.lastName} - ${data.position}`,
      categoryId: 18,
      stageId: 'DT1054_18:PREPARATION',

      ufCrm6Name: data.firstName,
      ufCrm6SecondName: data.middleName || '',
      ufCrm6LastName: data.lastName,
      ufCrm6Email: [data.email],
      ufCrm6PersonalMobile: [formatPhone(data.phone)],
      ufCrm6WorkPosition: data.position === 'Other' ? data.positionOther : data.position,
      ufCrm6UfLegalAddress: `${data.addressLine1}${data.addressLine2 ? ' ' + data.addressLine2 : ''}, ${data.city}, ${data.state} ${data.zipCode}`,

      ufCrm6AddressStreet: data.addressLine1 + (data.addressLine2 ? ' ' + data.addressLine2 : ''),
      ufCrm6AddressCity: data.city,
      ufCrm6AddressState: data.state,
      ufCrm6AddressZip: data.zipCode,
      ufCrm6AddressCountry: 'USA',
      ufCrm6AddressFull: `${data.addressLine1}${data.addressLine2 ? ' ' + data.addressLine2 : ''}, ${data.city}, ${data.state} ${data.zipCode}, USA`,

      ufCrm6Position: data.position === 'Other' ? data.positionOther : data.position,
      ufCrm6DesiredSalary: data.desiredSalary || '',
      ufCrm6AvailableStart: data.availableStartDate,
      ufCrm6EmploymentType: employmentTypeEnumId,
      ufCrm6ShiftPref: shiftEnumId,

      ufCrm6EducationLevel: educationEnumId,
      ufCrm6SchoolName: data.schoolName || '',
      ufCrm6Degree: data.fieldOfStudy || '',
      ufCrm6GraduationYear: data.graduationYear || '',

      ufCrm6Skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || ''),
      ufCrm6CertText: Array.isArray(data.certifications) ? data.certifications.join(', ') : (data.certifications || ''),
      ufCrm6Software: Array.isArray(data.softwareExperience) ? data.softwareExperience.join(', ') : (data.softwareExperience || ''),

      ufCrm6YearsExperience: data.yearsExperience || (data.hasWorkExperience === 'yes' ? 'Yes' : 'No'),
      ufCrm6PrevEmployer: data.workExperiences && data.workExperiences.length > 0 ? data.workExperiences[0].employer : '',
      ufCrm6PrevPosition: data.workExperiences && data.workExperiences.length > 0 ? data.workExperiences[0].position : '',
      ufCrm6EmploymentHistory: formatEmploymentHistory(data.workExperiences || []),

      ufCrm6References: formattedReferences,

      ufCrm6WorkAuth: workAuthEnumId,
      ufCrm6Felony: data.felonyConviction === 'yes' ? 'Y' : 'N',
      ufCrm6FelonyDetails: data.felonyExplanation || '',
      ufCrm6DrugTest: 'Y',
      ufCrm6BgCheck: data.backgroundCheckConsent === 'yes' ? 'Y' : 'N',
      ufCrm6Veteran: 'N',

      ufCrm6Source: 'Web Application Form',
      ufCrm6Referral: data.howDidYouHear || '',
      ufCrm6AppliedDate: new Date().toISOString(),
      ufCrm6IpAddress: 'verified-email',

      ufCrm6AdditionalInfo: JSON.stringify({
        applicationId: application.application_id,
        willingToRelocate: data.willingToRelocate,
        workExperiences: data.workExperiences || [],
        over18: data.over18,
        emailConsentGiven: data.emailConsentGiven,
        additionalInfo: data.additionalInfo,
        resumeUrl: application.resume_url,
        coverLetterUrl: application.cover_letter_url,
        submittedAt: new Date().toISOString(),
        emailVerifiedAt: new Date().toISOString()
      })
    };

    // Create Bitrix24 item
    let bitrixResult;
    try {
      bitrixResult = await bitrix.createItem(bitrixData);

      if (!bitrixResult) {
        throw new Error('Bitrix returned empty result');
      }
    } catch (bitrixError: any) {
      console.error('Bitrix24 API call failed during verification:', {
        error: bitrixError.message,
        stack: bitrixError.stack
      });
      throw new Error(`Bitrix24 integration error: ${bitrixError.message}`);
    }

    // Upload resume to Bitrix24 if available
    if (application.resume_url) {
      try {
        console.log(`[Application] Uploading resume from: ${application.resume_url}`);

        // Download resume from R2
        const resumeKey = application.resume_url.replace(/^.*\//, ''); // Extract key from URL
        const resumeObject = await env.ASSETS.get(resumeKey);

        if (resumeObject) {
          const resumeBuffer = await resumeObject.arrayBuffer();
          const fileName = resumeKey.split('/').pop() || 'resume.pdf';

          // Upload to Bitrix24 Resume/CV field
          await bitrix.uploadFileToEmployee(
            bitrixResult.id,
            fileName,
            resumeBuffer,
            'ufCrm6Resume'
          );

          console.log(`[Application] Resume uploaded successfully to Bitrix24 item ${bitrixResult.id}`);
        } else {
          console.warn(`[Application] Resume not found in R2: ${resumeKey}`);
        }
      } catch (resumeError: any) {
        // Don't fail the whole verification if resume upload fails
        console.error('[Application] Failed to upload resume to Bitrix24:', {
          error: resumeError.message,
          stack: resumeError.stack
        });
      }
    }

    // Update application status to submitted and mark email as verified
    await env.DB.prepare(`
      UPDATE applications
      SET status = 'submitted',
          email_verified = 1,
          verified_at = ?,
          bitrix_id = ?
      WHERE verification_token = ?
    `)
      .bind(
        Math.floor(Date.now() / 1000), // Unix timestamp
        bitrixResult.id,
        token
      )
      .run();

    // Log to audit trail
    await env.DB.prepare(`
      INSERT INTO audit_logs (action, status, metadata)
      VALUES (?, ?, ?)
    `)
      .bind(
        'application_verified',
        'success',
        JSON.stringify({
          applicationId: application.application_id,
          bitrixId: bitrixResult.id,
          applicantName: `${data.firstName} ${data.lastName}`,
          email: data.email
        })
      )
      .run();

    // Send final confirmation email
    try {
      const emailTemplate = getApplicationReceivedEmail({
        employeeName: `${data.firstName} ${data.lastName}`
      });

      await sendEmail(env, {
        to: data.email,
        toName: `${data.firstName} ${data.lastName}`,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        type: 'application_received'
      });

      console.log(`[Application] Final confirmation email sent to ${data.email}`);
    } catch (emailError) {
      console.error('[Application] Failed to send final confirmation email:', emailError);
    }

    return c.json({
      success: true,
      applicationId: application.application_id,
      bitrixId: bitrixResult.id,
      message: 'Email verified successfully! Your application has been submitted to Hartzell Companies.'
    });

  } catch (error: any) {
    console.error('Verification error:', {
      message: error.message || error,
      stack: error.stack
    });

    return c.json({
      success: false,
      error: 'Verification failed',
      message: 'An error occurred while verifying your email. Please contact support.'
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
