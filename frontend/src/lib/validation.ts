/**
 * Validation Utility Library
 * Centralized validation functions for forms across the application
 */

/**
 * Validate email address with proper regex
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate US phone number (XXX-XXX-XXXX format)
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;

  // Must be in format XXX-XXX-XXXX
  const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate ZIP code (5 digits)
 */
export function validateZipCode(zip: string): boolean {
  if (!zip) return false;

  const zipRegex = /^\d{5}$/;
  return zipRegex.test(zip);
}

/**
 * Validate state abbreviation (2 letters)
 */
export function validateState(state: string): boolean {
  if (!state) return false;

  return state.length === 2 && /^[A-Z]{2}$/.test(state.toUpperCase());
}

/**
 * Validate file size (max bytes)
 */
export function validateFileSize(file: File | null, maxSizeMB: number = 5): { valid: boolean; error?: string } {
  if (!file) return { valid: true };

  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
    };
  }

  return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(file: File | null, allowedTypes: string[]): { valid: boolean; error?: string } {
  if (!file) return { valid: true };

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Accepted: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export function sanitizeInput(input: string): string {
  if (!input) return input;

  // Remove script tags and potentially dangerous HTML
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return sanitized;
}

/**
 * Validate string length
 */
export function validateLength(value: string, min: number, max: number): { valid: boolean; error?: string } {
  if (!value) {
    if (min > 0) {
      return { valid: false, error: 'This field is required' };
    }
    return { valid: true };
  }

  if (value.length < min) {
    return { valid: false, error: `Must be at least ${min} characters` };
  }

  if (value.length > max) {
    return { valid: false, error: `Must be no more than ${max} characters` };
  }

  return { valid: true };
}

/**
 * Validate date is not in the past
 */
export function validateFutureDate(dateString: string): { valid: boolean; error?: string } {
  if (!dateString) {
    return { valid: false, error: 'Date is required' };
  }

  const inputDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  if (inputDate < today) {
    return { valid: false, error: 'Date cannot be in the past' };
  }

  return { valid: true };
}

/**
 * Format phone number as XXX-XXX-XXXX
 */
export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length >= 6) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  } else if (cleaned.length >= 3) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }

  return cleaned;
}

/**
 * Format ZIP code (remove non-digits, limit to 5)
 */
export function formatZipCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5);
}

/**
 * Format salary as currency (whole numbers only with commas)
 * Accepts: "50000", "$50,000", "50,000"
 * Returns: "50,000"
 */
export function formatSalary(value: string): string {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');

  // Don't format empty string
  if (!cleaned) return '';

  // Convert to number and back to add commas
  const number = parseInt(cleaned, 10);
  if (isNaN(number)) return '';

  // Format with commas (e.g., 50000 -> 50,000)
  return number.toLocaleString('en-US');
}

/**
 * Comprehensive form field validator
 */
export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean;
}

export function validateField(value: any, rules: ValidationRule[]): { valid: boolean; error?: string } {
  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return { valid: false, error: rule.message || 'This field is required' };
        }
        break;

      case 'email':
        if (value && !validateEmail(value)) {
          return { valid: false, error: rule.message || 'Invalid email address' };
        }
        break;

      case 'phone':
        if (value && !validatePhone(value)) {
          return { valid: false, error: rule.message || 'Phone must be in format XXX-XXX-XXXX' };
        }
        break;

      case 'minLength':
        if (value && value.length < (rule.value || 0)) {
          return { valid: false, error: rule.message || `Must be at least ${rule.value} characters` };
        }
        break;

      case 'maxLength':
        if (value && value.length > (rule.value || 0)) {
          return { valid: false, error: rule.message || `Must be no more than ${rule.value} characters` };
        }
        break;

      case 'pattern':
        if (value && rule.value && !rule.value.test(value)) {
          return { valid: false, error: rule.message || 'Invalid format' };
        }
        break;

      case 'custom':
        if (rule.validator && !rule.validator(value)) {
          return { valid: false, error: rule.message || 'Validation failed' };
        }
        break;
    }
  }

  return { valid: true };
}

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const MAX_FILE_SIZE_MB = 5;
