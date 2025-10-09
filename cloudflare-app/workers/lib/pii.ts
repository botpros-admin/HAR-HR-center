/**
 * PII Masking and Protection Utilities
 * Masks sensitive data in logs and cache to comply with privacy regulations
 */

/**
 * Mask SSN - show only last 4 digits
 */
export function maskSSN(ssn: string | undefined | null): string {
  if (!ssn) return '[NO_SSN]';
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length < 4) return '[REDACTED]';
  return `***-**-${cleaned.slice(-4)}`;
}

/**
 * Mask salary - show range instead of exact value
 */
export function maskSalary(salary: string | number | undefined | null): string {
  if (!salary) return '[NO_SALARY]';
  const numSalary = typeof salary === 'string' ? parseFloat(salary.replace(/\D/g, '')) : salary;

  if (isNaN(numSalary)) return '[REDACTED]';

  // Return salary range
  if (numSalary < 30000) return '$0-$30k';
  if (numSalary < 50000) return '$30k-$50k';
  if (numSalary < 75000) return '$50k-$75k';
  if (numSalary < 100000) return '$75k-$100k';
  if (numSalary < 150000) return '$100k-$150k';
  return '$150k+';
}

/**
 * Mask felony explanation - redact details
 */
export function maskFelonyDetails(explanation: string | undefined | null): string {
  if (!explanation) return '[NO_EXPLANATION]';
  return `[REDACTED_${explanation.length}_CHARS]`;
}

/**
 * Mask email - show only domain
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email || !email.includes('@')) return '[REDACTED_EMAIL]';
  const [, domain] = email.split('@');
  return `***@${domain}`;
}

/**
 * Mask date of birth - show only year
 */
export function maskDOB(dob: string | undefined | null): string {
  if (!dob) return '[NO_DOB]';
  try {
    const year = new Date(dob).getFullYear();
    return `****-**-** (${year})`;
  } catch {
    return '[REDACTED_DOB]';
  }
}

/**
 * Sanitize object for logging - recursively masks sensitive fields
 */
export function sanitizeForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    const lowerKey = key.toLowerCase();
    const value = obj[key];

    // Mask SSN fields
    if (lowerKey.includes('ssn')) {
      sanitized[key] = maskSSN(value);
    }
    // Mask salary fields
    else if (lowerKey.includes('salary') || lowerKey.includes('compensation')) {
      sanitized[key] = maskSalary(value);
    }
    // Mask felony fields
    else if (lowerKey.includes('felony') && lowerKey.includes('explanation')) {
      sanitized[key] = maskFelonyDetails(value);
    }
    // Mask DOB fields
    else if (lowerKey.includes('birth') || lowerKey.includes('dob')) {
      sanitized[key] = maskDOB(value);
    }
    // Mask email partially
    else if (lowerKey.includes('email') && typeof value === 'string') {
      sanitized[key] = maskEmail(value);
    }
    // Recurse for nested objects
    else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    }
    // Keep other fields as-is
    else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Redact sensitive application data before storage
 * This removes/masks PII that shouldn't be persisted
 */
export function redactApplicationData(data: any): any {
  const redacted = { ...data };

  // Redact salary expectations (store range only)
  if (redacted.desiredSalary) {
    redacted.desiredSalary = maskSalary(redacted.desiredSalary);
  }

  // Redact felony conviction flag (store boolean only, not details)
  if (typeof redacted.felonyConviction !== 'undefined') {
    redacted.felonyConviction = Boolean(redacted.felonyConviction);
  }

  // Redact felony explanation details completely
  if (redacted.felonyExplanation) {
    delete redacted.felonyExplanation; // Don't store at all
  }

  // Redact SSN consent completely
  if (redacted.ssnConsent) {
    delete redacted.ssnConsent; // Don't store at all
  }

  // Redact background check consent details (keep boolean only)
  if (typeof redacted.backgroundCheckConsent === 'string') {
    redacted.backgroundCheckConsent = redacted.backgroundCheckConsent === 'yes';
  }

  // Delete any other sensitive fields that shouldn't be persisted
  delete redacted.ssn; // Just in case
  delete redacted.socialSecurityNumber; // Just in case

  // Keep other legally required data intact:
  // - Name, contact info (needed for hiring)
  // - Work history (needed for verification)
  // - Education (needed for qualification checks)
  // - References (needed for background checks)
  // - Legal flags like over18, authorizedToWork (compliance)

  return redacted;
}
