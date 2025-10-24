'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, MapPin, Briefcase, Upload, CheckCircle, FileText, Award, Users, Plus, Trash2 } from 'lucide-react';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import { CaptchaGate } from '@/components/CaptchaGate';
import { Toast, ToastContainer } from '@/components/Toast';
import TagInput from '@/components/TagInput';
import { useFieldAutoSave, useCheckDuplicate, useAutoLoadDraft } from '@/hooks/useFieldAutoSave';
// Email verification removed - using magic link instead
import {
  validateEmail,
  validatePhone,
  validateZipCode,
  validateState,
  validateFileSize,
  validateFileType,
  formatPhone,
  formatZipCode,
  formatSalary,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE_MB
} from '@/lib/validation';

const POSITIONS = [
  'Manufacturing Technician',
  'Quality Control Inspector',
  'Assembly Line Worker',
  'Warehouse Associate',
  'Machine Operator',
  'Production Supervisor',
  'Maintenance Technician',
  'Supply Chain Coordinator',
  'Engineering Technician',
  'Administrative Assistant',
  'Human Resources Specialist',
  'Other'
];

const EDUCATION_LEVELS = [
  'High School Diploma/GED',
  'Some College',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctorate',
  'Trade/Vocational Certificate'
];

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCaptchaGate, setShowCaptchaGate] = useState(false);
  const [isProgressSticky, setIsProgressSticky] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Check for CAPTCHA token on mount
  useEffect(() => {
    const turnstileToken = sessionStorage.getItem('captchaToken');
    const captchaTimestamp = sessionStorage.getItem('captchaTimestamp');
    const now = Date.now();

    // Cloudflare Turnstile tokens expire after 5 minutes (300 seconds)
    // We check for 4 minutes (240000 ms) to be safe
    const TOKEN_EXPIRY = 240000; // 4 minutes

    if (!turnstileToken || !captchaTimestamp || (now - parseInt(captchaTimestamp)) > TOKEN_EXPIRY) {
      // Show CAPTCHA gate if no token, no timestamp, or expired
      setShowCaptchaGate(true);

      // Clear expired token
      if (turnstileToken) {
        sessionStorage.removeItem('captchaToken');
        sessionStorage.removeItem('captchaTimestamp');
      }
    }
  }, []);

  // Handle scroll for sticky progress bar
  useEffect(() => {
    const handleScroll = () => {
      setIsProgressSticky(window.scrollY > 180);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Periodic CAPTCHA token expiry check
  useEffect(() => {
    // Cloudflare Turnstile tokens expire after 5 minutes
    const TOKEN_EXPIRY = 240000; // 4 minutes (240 seconds)
    const WARNING_THRESHOLD = 180000; // Show warning at 3 minutes

    const checkTokenExpiry = () => {
      const captchaTimestamp = sessionStorage.getItem('captchaTimestamp');
      if (!captchaTimestamp) return;

      const now = Date.now();
      const age = now - parseInt(captchaTimestamp);

      // If token is older than 3 minutes, show warning
      if (age > WARNING_THRESHOLD && age <= TOKEN_EXPIRY) {
        showToast('Your CAPTCHA verification will expire soon. You may need to reverify before submitting.', 'warning');
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiry, 30000);

    return () => clearInterval(interval);
  }, []);

  // Form data
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',

    // Position Information
    position: '',
    positionOther: '',
    desiredSalary: '',
    availableStartDate: '',
    employmentType: 'Full-time',
    shift: 'Day',
    willingToRelocate: '',

    // Work Experience
    hasWorkExperience: '',
    yearsExperience: '',

    // Education
    educationLevel: '',
    schoolName: '',
    graduationYear: '',
    fieldOfStudy: '',

    // Skills & Certifications (now arrays for tag input)
    skills: [] as string[],
    certifications: [] as string[],
    softwareExperience: [] as string[],

    // References (dynamic array - starts with 1 required reference)
    references: [{ name: '', phone: '', relationship: '' }] as Array<{ name: string; phone: string; relationship: string }>,

    // Legal
    authorizedToWork: '',
    requiresSponsorship: '',
    over18: '',
    backgroundCheckConsent: '',
    felonyConviction: '',
    felonyExplanation: '',

    // Additional
    howDidYouHear: '',
    additionalInfo: '',
    emailConsentGiven: false
  });

  const [files, setFiles] = useState({
    resume: null as File | null
  });

  const [workExperiences, setWorkExperiences] = useState<Array<{
    employer: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>>([]);

  // Google Places Autocomplete for address
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const addressInputRef = useGooglePlaces({
    apiKey: googleMapsApiKey,
    onPlaceSelected: (place) => {
      setFormData(prev => ({
        ...prev,
        addressLine1: place.street,
        city: place.city,
        state: place.state,
        zipCode: place.zipCode
      }));
    }
  });

  const totalSteps = 5;

  // Auto-save hooks for each field
  const emailAutoSave = useFieldAutoSave('email', formData.email, step);
  const firstNameAutoSave = useFieldAutoSave('firstName', formData.firstName, step);
  const middleNameAutoSave = useFieldAutoSave('middleName', formData.middleName, step);
  const lastNameAutoSave = useFieldAutoSave('lastName', formData.lastName, step);
  const phoneAutoSave = useFieldAutoSave('phone', formData.phone, step);
  const addressLine1AutoSave = useFieldAutoSave('addressLine1', formData.addressLine1, step);
  const cityAutoSave = useFieldAutoSave('city', formData.city, step);
  const stateAutoSave = useFieldAutoSave('state', formData.state, step);
  const zipCodeAutoSave = useFieldAutoSave('zipCode', formData.zipCode, step);

  // Step 2 - Position Info
  const positionAutoSave = useFieldAutoSave('position', formData.position, step);
  const desiredSalaryAutoSave = useFieldAutoSave('desiredSalary', formData.desiredSalary, step);
  const availableStartDateAutoSave = useFieldAutoSave('availableStartDate', formData.availableStartDate, step);
  const employmentTypeAutoSave = useFieldAutoSave('employmentType', formData.employmentType, step);
  const shiftAutoSave = useFieldAutoSave('shift', formData.shift, step);

  // Step 3 - Education & Experience
  const educationLevelAutoSave = useFieldAutoSave('educationLevel', formData.educationLevel, step);
  const schoolNameAutoSave = useFieldAutoSave('schoolName', formData.schoolName, step);
  const fieldOfStudyAutoSave = useFieldAutoSave('fieldOfStudy', formData.fieldOfStudy, step);
  const graduationYearAutoSave = useFieldAutoSave('graduationYear', formData.graduationYear, step);
  const yearsExperienceAutoSave = useFieldAutoSave('yearsExperience', formData.yearsExperience, step);

  // Step 4 - Skills & References
  const skillsAutoSave = useFieldAutoSave('skills', formData.skills, step);
  const certificationsAutoSave = useFieldAutoSave('certifications', formData.certifications, step);
  const softwareExperienceAutoSave = useFieldAutoSave('softwareExperience', formData.softwareExperience, step);
  const referencesAutoSave = useFieldAutoSave('references', formData.references, step);

  // Step 5 - Legal & Background
  const authorizedToWorkAutoSave = useFieldAutoSave('authorizedToWork', formData.authorizedToWork, step);
  const felonyConvictionAutoSave = useFieldAutoSave('felonyConviction', formData.felonyConviction, step);
  const backgroundCheckConsentAutoSave = useFieldAutoSave('backgroundCheckConsent', formData.backgroundCheckConsent, step);
  const howDidYouHearAutoSave = useFieldAutoSave('howDidYouHear', formData.howDidYouHear, step);

  // Duplicate detection hook
  const { checkDuplicate, duplicate, clearDuplicate } = useCheckDuplicate(formData.email);

  // Auto-load draft hook
  const { loaded, draftData, hasDraft } = useAutoLoadDraft();

  // Draft ID for auto-save
  const draftId = typeof window !== 'undefined' ? sessionStorage.getItem('draftId') : null;

  // Pre-fill form with draft data on load
  useEffect(() => {
    if (hasDraft && draftData) {
      setFormData(prev => ({
        ...prev,
        ...draftData
      }));

      // Also restore the step if saved
      if (draftData.currentStep) {
        setStep(draftData.currentStep);
      }
    }
  }, [hasDraft, draftData]);

  // Check for duplicates when email changes (but NOT if we already have a draftId)
  useEffect(() => {
    // Skip duplicate check if we're already working on a draft
    const existingDraftId = typeof window !== 'undefined' ? sessionStorage.getItem('draftId') : null;

    // Only check if email is valid (not just contains @)
    if (formData.email && validateEmail(formData.email) && !existingDraftId) {
      checkDuplicate();
    }
  }, [formData.email, checkDuplicate]);

  // Step validation function - returns errors object with field names as keys
  const validateStep = (currentStep: number): { valid: boolean; errors: Record<string, string>; firstInvalidField?: string } => {
    const stepErrors: Record<string, string> = {};
    let firstInvalidField: string | undefined;

    const addError = (fieldName: string, message: string) => {
      stepErrors[fieldName] = message;
      if (!firstInvalidField) {
        firstInvalidField = fieldName;
      }
    };

    switch (currentStep) {
      case 1: // Personal Information
        if (!formData.firstName.trim()) addError('firstName', 'First name is required');
        if (!formData.lastName.trim()) addError('lastName', 'Last name is required');
        if (!formData.email.trim()) {
          addError('email', 'Email is required');
        } else if (!validateEmail(formData.email)) {
          addError('email', 'Invalid email format');
        }
        if (!formData.emailConsentGiven) addError('emailConsentGiven', 'Email consent is required');
        if (!formData.phone.trim()) {
          addError('phone', 'Phone number is required');
        } else if (!validatePhone(formData.phone)) {
          addError('phone', 'Phone must be in format XXX-XXX-XXXX');
        }
        if (!formData.addressLine1.trim()) addError('addressLine1', 'Address is required');
        if (!formData.city.trim()) addError('city', 'City is required');
        if (!formData.state.trim()) {
          addError('state', 'State is required');
        } else if (!validateState(formData.state)) {
          addError('state', 'State must be 2 letters');
        }
        if (!formData.zipCode.trim()) {
          addError('zipCode', 'ZIP code is required');
        } else if (!validateZipCode(formData.zipCode)) {
          addError('zipCode', 'ZIP code must be 5 digits');
        }
        break;

      case 2: // Position Information
        if (!formData.position) addError('position', 'Position is required');
        if (formData.position === 'Other' && !formData.positionOther.trim()) {
          addError('positionOther', 'Please specify the position');
        }
        if (!formData.availableStartDate) addError('availableStartDate', 'Start date is required');
        if (!formData.willingToRelocate) addError('willingToRelocate', 'Please select an option');
        break;

      case 3: // Work Experience & Education
        // Work experience is only required if no resume is uploaded
        if (!files.resume && !formData.hasWorkExperience) {
          addError('hasWorkExperience', 'Please select an option or upload resume');
        }
        if (!formData.educationLevel) addError('educationLevel', 'Education level is required');
        break;

      case 4: // Skills & References - all optional
        break;

      case 5: // Legal & Background
        if (!formData.authorizedToWork) addError('authorizedToWork', 'Please select an option');
        if (!formData.requiresSponsorship) addError('requiresSponsorship', 'Please select an option');
        if (!formData.over18) addError('over18', 'Please select an option');
        if (!formData.felonyConviction) addError('felonyConviction', 'Please select an option');
        if (formData.felonyConviction === 'yes' && !formData.felonyExplanation.trim()) {
          addError('felonyExplanation', 'Explanation is required');
        }
        if (formData.backgroundCheckConsent !== 'yes') {
          addError('backgroundCheckConsent', 'Consent is required');
        }
        break;

      case 6: // Documents & Submit - all optional
        break;
    }

    return {
      valid: Object.keys(stepErrors).length === 0,
      errors: stepErrors,
      firstInvalidField
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Handle checkboxes
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));

      // Clear error if checkbox is now checked
      if (checked && errors[name]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
      return;
    }

    // Email validation is handled onBlur, but we clear the error if they're typing and it becomes valid
    if (name === 'email' && value && validateEmail(value) && errors.email) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }

    // Auto-format phone number (XXX-XXX-XXXX)
    if (name === 'phone' || name === 'reference1Phone' || name === 'reference2Phone') {
      const formatted = formatPhone(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));

      // Clear error if exists and phone becomes valid (but don't show error while typing)
      if (formatted && validatePhone(formatted) && errors[name]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
      return;
    }

    // Auto-format ZIP code
    if (name === 'zipCode') {
      const formatted = formatZipCode(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));

      // Validate ZIP
      if (formatted && !validateZipCode(formatted)) {
        setErrors(prev => ({ ...prev, zipCode: 'ZIP code must be 5 digits' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.zipCode;
          return newErrors;
        });
      }
      return;
    }

    // Auto-format salary (whole numbers with commas)
    if (name === 'desiredSalary') {
      const formatted = formatSalary(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }

    // Validate state (2 letters)
    if (name === 'state') {
      const uppercased = value.toUpperCase().slice(0, 2);
      setFormData(prev => ({ ...prev, [name]: uppercased }));

      if (uppercased && !validateState(uppercased)) {
        setErrors(prev => ({ ...prev, state: 'State must be 2 letters' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.state;
          return newErrors;
        });
      }
      return;
    }

    // Update form data
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for simple required fields (not email, phone, zipCode, state - they have their own validation)
    const fieldsWithSpecificValidation = ['email', 'phone', 'zipCode', 'state', 'reference1Phone', 'reference2Phone'];
    if (value && value.trim() !== '' && errors[name] && !fieldsWithSpecificValidation.includes(name)) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Validate email on blur
    if (name === 'email') {
      if (!value || value.trim() === '') {
        // Don't show error for empty field on blur - that's handled by "Next" button
        return;
      }
      if (!validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: 'Email must contain @ and a valid domain (e.g., user@example.com)' }));
      }
    }

    // Validate phone on blur
    if (name === 'phone') {
      if (!value || value.trim() === '') {
        // Don't show error for empty field on blur - that's handled by "Next" button
        return;
      }
      if (!validatePhone(value)) {
        setErrors(prev => ({ ...prev, phone: 'Phone must be in format XXX-XXX-XXXX' }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size
      const sizeValidation = validateFileSize(file, MAX_FILE_SIZE_MB);
      if (!sizeValidation.valid) {
        showToast(sizeValidation.error!, 'error');
        e.target.value = ''; // Clear the input
        return;
      }

      // Validate file type
      const typeValidation = validateFileType(file, ALLOWED_DOCUMENT_TYPES);
      if (!typeValidation.valid) {
        showToast(typeValidation.error!, 'error');
        e.target.value = ''; // Clear the input
        return;
      }

      setFiles({ resume: file });
      showToast('Resume uploaded successfully', 'success');
    }
  };

  const addWorkExperience = () => {
    setWorkExperiences([...workExperiences, {
      employer: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      description: ''
    }]);
  };

  const removeWorkExperience = (index: number) => {
    setWorkExperiences(workExperiences.filter((_, i) => i !== index));
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    const updated = [...workExperiences];
    updated[index] = { ...updated[index], [field]: value };
    setWorkExperiences(updated);
  };

  const handleCaptchaVerified = () => {
    // Store timestamp when CAPTCHA is verified
    sessionStorage.setItem('captchaTimestamp', Date.now().toString());

    // Close the CAPTCHA gate and allow user to fill out the form
    setShowCaptchaGate(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors
    if (Object.keys(errors).length > 0) {
      showToast('Please fix all validation errors before submitting', 'warning');
      return;
    }

    // Get CAPTCHA token from sessionStorage and validate it's not expired
    const turnstileToken = sessionStorage.getItem('captchaToken');
    const captchaTimestamp = sessionStorage.getItem('captchaTimestamp');
    const now = Date.now();
    // Cloudflare Turnstile tokens expire after 5 minutes (300 seconds)
    // We check for 4 minutes (240000 ms) to be safe
    const TOKEN_EXPIRY = 240000; // 4 minutes

    if (!turnstileToken || !captchaTimestamp) {
      showToast('CAPTCHA verification required. Please verify you\'re human to submit.', 'warning');
      setShowCaptchaGate(true);
      return;
    }

    if ((now - parseInt(captchaTimestamp)) > TOKEN_EXPIRY) {
      showToast('CAPTCHA expired. Please verify again before submitting.', 'warning');
      sessionStorage.removeItem('captchaToken');
      sessionStorage.removeItem('captchaTimestamp');
      setShowCaptchaGate(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Get draft ID from sessionStorage
      const draftId = sessionStorage.getItem('draftId');

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('data', JSON.stringify({
        ...formData,
        workExperiences,
        turnstileToken,
        draftId // Include draftId so backend can update existing Bitrix24 item
      }));

      if (files.resume) {
        submitData.append('resume', files.resume);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/applications/submit`, {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.details) {
          console.error('Validation errors:', errorData.details);
          const errorMessages = errorData.details.map((e: any) => `${e.field}: ${e.message}`).join(', ');
          showToast(`Validation error: ${errorMessages}`, 'error');
        } else {
          showToast(errorData?.error || 'Submission failed. Please try again.', 'error');
        }
        throw new Error('Submission failed');
      }

      // Clear draft from sessionStorage on successful submit
      sessionStorage.removeItem('draftId');
      sessionStorage.removeItem('sessionId');

      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      if (!(error as any).message?.includes('Submission failed')) {
        showToast('Failed to submit application. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="card max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Almost Done!</h1>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for your interest in joining the Hartzell team. Your application has been received.
          </p>

          {/* Email verification required */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6 text-left">
            <h2 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Action Required: Verify Your Email
            </h2>
            <p className="text-gray-800 mb-3 font-medium">
              We've sent a verification email to <strong className="text-blue-700">{formData.email}</strong>
            </p>
            <p className="text-gray-700 mb-2">
              <strong>To complete your application:</strong>
            </p>
            <ol className="text-sm text-gray-700 space-y-1 ml-4 list-decimal">
              <li>Check your inbox for an email from Hartzell Companies</li>
              <li>Click the "Confirm My Application" button in the email</li>
              <li>Your application will then be submitted to our HR team</li>
            </ol>
            <p className="text-sm text-gray-600 mt-3 italic">
              The verification link will expire in 24 hours. If you don't see the email, check your spam folder.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Why do we verify emails?</h3>
            <p className="text-sm text-blue-800">
              Email verification helps us ensure we can reach you with important updates about your application and prevents spam submissions.
            </p>
          </div>

          <p className="text-sm text-gray-500 mb-8">
            Once verified, our HR team will carefully review your application. If your qualifications align with our current opportunities, we will contact you to discuss next steps.
          </p>

          <div className="mt-8">
            <a href="/" className="btn btn-primary">
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 py-8 px-4">
      {/* Toast Container */}
      <ToastContainer>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-hartzell-blue to-blue-700 bg-clip-text text-transparent mb-2">
            Join the Hartzell Team
          </h1>
          <p className="text-lg text-gray-600">Complete your application below</p>
        </div>

        {/* Progress Bar - Sticky */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            isProgressSticky
              ? 'fixed top-0 left-0 right-0 z-40 bg-white shadow-lg py-3 px-4'
              : 'mb-8 bg-white rounded-xl shadow-md p-6 border border-gray-200'
          }`}
        >
          <div className={`max-w-4xl mx-auto transition-all duration-500`}>
            <div className={`flex items-center justify-between transition-all duration-500 ${isProgressSticky ? 'mb-2' : 'mb-3'}`}>
              <span className={`${isProgressSticky ? 'text-xs' : 'text-sm'} font-bold text-gray-900 transition-all duration-500`}>
                Step {step} of {totalSteps}
              </span>
              <span className={`${isProgressSticky ? 'text-xs' : 'text-sm'} font-semibold text-hartzell-blue transition-all duration-500`}>
                {Math.round((step / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className={`w-full bg-gray-200 rounded-full ${isProgressSticky ? 'h-2' : 'h-3'} shadow-inner transition-all duration-500 overflow-hidden`}>
              <div
                className="bg-gradient-to-r from-hartzell-blue via-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out shadow-md relative"
                style={{ width: `${(step / totalSteps) * 100}%`, height: '100%' }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Spacer to prevent layout shift when progress bar becomes sticky */}
        {isProgressSticky && <div className="mb-8" style={{ height: '88px' }}></div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          handleBlur(e);
                          firstNameAutoSave.saveField();
                        }}
                        required
                        className={`input ${errors.firstName ? 'border-red-500 border-2' : ''}`}
                        placeholder="John"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">
                      Middle Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleInputChange}
                        onBlur={middleNameAutoSave.saveField}
                        className="input"
                        placeholder="Middle"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          handleBlur(e);
                          lastNameAutoSave.saveField();
                        }}
                        required
                        className={`input ${errors.lastName ? 'border-red-500 border-2' : ''}`}
                        placeholder="Doe"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={(e) => {
                        handleBlur(e);
                        emailAutoSave.saveField();
                      }}
                      required
                      className={`input pl-10 ${errors.email ? 'border-red-500 border-2' : ''}`}
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className={`flex items-center gap-2 text-sm ${errors.emailConsentGiven ? 'text-red-500' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      name="emailConsentGiven"
                      checked={formData.emailConsentGiven}
                      onChange={handleInputChange}
                      required
                      className={`w-4 h-4 text-hartzell-blue border-gray-300 rounded focus:ring-hartzell-blue ${errors.emailConsentGiven ? 'border-red-500 border-2' : ''}`}
                    />
                    <span>
                      I consent to receive email and phone correspondence regarding my application and work opportunities <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {errors.emailConsentGiven && (
                    <p className="text-red-500 text-sm mt-1">{errors.emailConsentGiven}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      onBlur={(e) => {
                        handleBlur(e);
                        phoneAutoSave.saveField();
                      }}
                      required
                      className={`input pl-10 ${errors.phone ? 'border-red-500 border-2' : ''}`}
                      placeholder="954-123-4567"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={addressInputRef}
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      onBlur={(e) => {
                        handleBlur(e);
                        addressLine1AutoSave.saveField();
                      }}
                      required
                      className={`input ${errors.addressLine1 ? 'border-red-500 border-2' : ''}`}
                      placeholder="Start typing your address..."
                      autoComplete="off"
                    />
                  </div>
                  {errors.addressLine1 ? (
                    <p className="text-red-500 text-sm mt-1">{errors.addressLine1}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Start typing and select from the dropdown to auto-fill city, state, and ZIP
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="form-label">
                      City <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          handleBlur(e);
                          cityAutoSave.saveField();
                        }}
                        required
                        className={`input ${errors.city ? 'border-red-500 border-2' : ''}`}
                        placeholder="Pompano Beach"
                      />
                    </div>
                    {errors.city && (
                      <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">
                      State <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          handleBlur(e);
                          stateAutoSave.saveField();
                        }}
                        required
                        className={`input ${errors.state ? 'border-red-500 border-2' : ''}`}
                        placeholder="FL"
                        maxLength={2}
                      />
                    </div>
                    {errors.state && (
                      <p className="text-red-500 text-sm mt-1">{errors.state}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          handleBlur(e);
                          zipCodeAutoSave.saveField();
                        }}
                        required
                        className={`input ${errors.zipCode ? 'border-red-500 border-2' : ''}`}
                        placeholder="33060"
                      />
                    </div>
                    {errors.zipCode && (
                      <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Position Information */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Position Information</h2>
                </div>

                <div>
                  <label className="form-label">
                    Position Applying For <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      onBlur={() => {
                        positionAutoSave.saveField();
                      }}
                      required
                      className={`input ${errors.position ? 'border-red-500 border-2' : ''}`}
                    >
                      <option value="">Select a position...</option>
                      {POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                  {errors.position && (
                    <p className="text-red-500 text-sm mt-1">{errors.position}</p>
                  )}
                </div>

                {formData.position === 'Other' && (
                  <div>
                    <label className="form-label">
                      Please specify position
                    </label>
                    <input
                      type="text"
                      name="positionOther"
                      value={formData.positionOther}
                      onChange={handleInputChange}
                      className={`input ${errors.positionOther ? 'border-red-500 border-2' : ''}`}
                      placeholder="Enter position title"
                    />
                    {errors.positionOther && (
                      <p className="text-red-500 text-sm mt-1">{errors.positionOther}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Employment Type <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="employmentType"
                        value={formData.employmentType}
                        onChange={handleInputChange}
                        onBlur={employmentTypeAutoSave.saveField}
                        required
                        className="input"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Temporary">Temporary</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">
                      Preferred Shift <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="shift"
                        value={formData.shift}
                        onChange={handleInputChange}
                        onBlur={shiftAutoSave.saveField}
                        required
                        className="input"
                      >
                        <option value="Day">Day Shift</option>
                        <option value="Night">Night Shift</option>
                        <option value="Swing">Swing Shift</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Desired Salary (Annual)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="desiredSalary"
                        value={formData.desiredSalary}
                        onChange={handleInputChange}
                        onBlur={desiredSalaryAutoSave.saveField}
                        className="input"
                        placeholder="$50,000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">
                      Available Start Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="availableStartDate"
                        value={formData.availableStartDate}
                        onChange={handleInputChange}
                        onBlur={(e) => {
                          handleBlur(e);
                          availableStartDateAutoSave.saveField();
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className={`input ${errors.availableStartDate ? 'border-red-500 border-2' : ''}`}
                      />
                    </div>
                    {errors.availableStartDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.availableStartDate}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Willing to Relocate? <span className="text-red-500">*</span>
                  </label>
                  <div className={`flex gap-4 ${errors.willingToRelocate ? 'border-2 border-red-500 p-2 rounded' : ''}`}>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="willingToRelocate"
                        value="yes"
                        checked={formData.willingToRelocate === 'yes'}
                        onChange={handleInputChange}
                        required
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="willingToRelocate"
                        value="no"
                        checked={formData.willingToRelocate === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {errors.willingToRelocate && (
                    <p className="text-red-500 text-sm mt-1">{errors.willingToRelocate}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Work Experience & Education */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Experience & Education</h2>
                </div>

                {/* Resume Upload Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>💡 Tip:</strong> Upload your resume to skip manual work experience entry!
                  </p>
                  <label className="form-label">
                    Upload Resume (Recommended)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-hartzell-blue file:text-white
                      hover:file:bg-blue-700
                      cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, or DOCX (Max 5MB)</p>
                  {files.resume && (
                    <p className="text-sm text-green-600 mt-2">✓ {files.resume.name} uploaded</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Do you have work experience? {!files.resume && <span className="text-red-500">*</span>}
                    {files.resume && <span className="text-gray-500 text-sm ml-2">(Optional - resume uploaded)</span>}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasWorkExperience"
                        value="yes"
                        checked={formData.hasWorkExperience === 'yes'}
                        onChange={handleInputChange}
                        required
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="hasWorkExperience"
                        value="no"
                        checked={formData.hasWorkExperience === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>

                {formData.hasWorkExperience === 'yes' && (
                  <>
                    <div className="space-y-4">
                      {workExperiences.map((exp, index) => (
                        <div key={index} className="border-2 border-gray-200 rounded-lg p-4 relative">
                          <button
                            type="button"
                            onClick={() => removeWorkExperience(index)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          >
                            ✕ Remove
                          </button>

                          <h4 className="font-semibold text-gray-900 mb-3">Experience #{index + 1}</h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="form-label">Employer</label>
                              <input
                                type="text"
                                value={exp.employer}
                                onChange={(e) => updateWorkExperience(index, 'employer', e.target.value)}
                                className="input"
                                placeholder="Company Name"
                              />
                            </div>
                            <div>
                              <label className="form-label">Position</label>
                              <input
                                type="text"
                                value={exp.position}
                                onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                                className="input"
                                placeholder="Job Title"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="form-label">Start Date</label>
                              <input
                                type="month"
                                value={exp.startDate}
                                onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                                className="input"
                              />
                            </div>
                            <div>
                              <label className="form-label">End Date</label>
                              <input
                                type="month"
                                value={exp.endDate}
                                onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                                disabled={exp.current}
                                className="input"
                              />
                              <label className="flex items-center gap-2 mt-2">
                                <input
                                  type="checkbox"
                                  checked={exp.current}
                                  onChange={(e) => updateWorkExperience(index, 'current', e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">Currently work here</span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="form-label">Description (Optional)</label>
                            <textarea
                              value={exp.description}
                              onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                              className="input"
                              rows={3}
                              placeholder="Briefly describe your responsibilities..."
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addWorkExperience}
                        className="btn-secondary w-full"
                      >
                        + Add Work Experience
                      </button>
                    </div>

                    <div>
                      <label className="form-label">
                        Years of Relevant Experience
                      </label>
                      <div className="relative">
                        <select
                          name="yearsExperience"
                          value={formData.yearsExperience}
                          onChange={handleInputChange}
                          onBlur={yearsExperienceAutoSave.saveField}
                          className="input"
                        >
                          <option value="">Select...</option>
                          <option value="<1">Less than 1 year</option>
                          <option value="1-2">1-2 years</option>
                          <option value="3-5">3-5 years</option>
                          <option value="6-10">6-10 years</option>
                          <option value="10+">10+ years</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <hr className="my-6" />

                <div>
                  <label className="form-label">
                    Highest Education Level <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="educationLevel"
                      value={formData.educationLevel}
                      onChange={handleInputChange}
                      onBlur={() => {
                        educationLevelAutoSave.saveField();
                      }}
                      required
                      className={`input ${errors.educationLevel ? 'border-red-500 border-2' : ''}`}
                    >
                      <option value="">Select education level...</option>
                      {EDUCATION_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  {errors.educationLevel && (
                    <p className="text-red-500 text-sm mt-1">{errors.educationLevel}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      School/Institution Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleInputChange}
                        onBlur={schoolNameAutoSave.saveField}
                        className="input"
                        placeholder="University/School Name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">
                      Graduation Year
                    </label>
                    <div className="relative">
                      <select
                        name="graduationYear"
                        value={formData.graduationYear}
                        onChange={handleInputChange}
                        onBlur={graduationYearAutoSave.saveField}
                        className="input"
                      >
                      <option value="">Select year...</option>
                      {Array.from({ length: 70 }, (_, i) => {
                        const year = new Date().getFullYear() + 5 - i; // 5 years future to 65 years past
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Field of Study/Major
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="fieldOfStudy"
                      value={formData.fieldOfStudy}
                      onChange={handleInputChange}
                      onBlur={fieldOfStudyAutoSave.saveField}
                      className="input"
                      placeholder="e.g., Mechanical Engineering"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Skills & References */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Skills & References</h2>
                </div>

                <div>
                  <label className="form-label">
                    Relevant Skills
                  </label>
                  <TagInput
                    value={formData.skills}
                    onChange={(tags) => {
                      setFormData(prev => ({ ...prev, skills: tags }));
                      // Auto-save will trigger when skills array changes
                      setTimeout(() => skillsAutoSave.saveField(), 500);
                    }}
                    placeholder="Type a skill and press Enter"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., Welding, Quality Control, Forklift Operation</p>
                </div>

                <div>
                  <label className="form-label">
                    Certifications/Licenses
                  </label>
                  <TagInput
                    value={formData.certifications}
                    onChange={(tags) => {
                      setFormData(prev => ({ ...prev, certifications: tags }));
                      setTimeout(() => certificationsAutoSave.saveField(), 500);
                    }}
                    placeholder="Type a certification and press Enter"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., OSHA Safety Certification, Forklift License</p>
                </div>

                <div>
                  <label className="form-label">
                    Software/Systems Experience
                  </label>
                  <TagInput
                    value={formData.softwareExperience}
                    onChange={(tags) => {
                      setFormData(prev => ({ ...prev, softwareExperience: tags }));
                      setTimeout(() => softwareExperienceAutoSave.saveField(), 500);
                    }}
                    placeholder="Type software/system and press Enter"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., SAP, Microsoft Office, AutoCAD</p>
                </div>

                <hr className="my-6" />

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Professional References <span className="text-red-500">*</span>
                    <span className="text-sm font-normal text-gray-600 ml-2">(At least 1 required, up to 3)</span>
                  </h3>
                  {formData.references.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        references: [...prev.references, { name: '', phone: '', relationship: '' }]
                      }))}
                      className="btn btn-secondary text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Reference
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {formData.references.map((ref, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-700">
                          Reference {index + 1}
                          {index === 0 && <span className="text-red-500 ml-1">*</span>}
                          {index > 0 && <span className="text-gray-500 ml-1">(Optional)</span>}
                        </p>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              references: prev.references.filter((_, i) => i !== index)
                            }))}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="form-label">
                            Full Name {index === 0 && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={ref.name}
                            onChange={(e) => {
                              const updated = [...formData.references];
                              updated[index].name = e.target.value;
                              setFormData(prev => ({ ...prev, references: updated }));
                            }}
                            className="input"
                            placeholder="John Smith"
                            required={index === 0}
                          />
                        </div>
                        <div>
                          <label className="form-label">
                            Phone Number {index === 0 && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="tel"
                            value={ref.phone}
                            onChange={(e) => {
                              const formatted = formatPhone(e.target.value);
                              const updated = [...formData.references];
                              updated[index].phone = formatted;
                              setFormData(prev => ({ ...prev, references: updated }));
                            }}
                            className="input"
                            placeholder="123-456-7890"
                            required={index === 0}
                          />
                        </div>
                        <div>
                          <label className="form-label">
                            Relationship {index === 0 && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={ref.relationship}
                            onChange={(e) => {
                              const updated = [...formData.references];
                              updated[index].relationship = e.target.value;
                              setFormData(prev => ({ ...prev, references: updated }));
                            }}
                            className="input"
                            placeholder="Former Supervisor"
                            required={index === 0}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Legal & Background */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Legal & Background</h2>
                </div>

                <div>
                  <label className="form-label">
                    Are you legally authorized to work in the United States? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="authorizedToWork"
                        value="yes"
                        checked={formData.authorizedToWork === 'yes'}
                        onChange={(e) => {
                          handleInputChange(e);
                          setTimeout(() => authorizedToWorkAutoSave.saveField(), 300);
                        }}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="authorizedToWork"
                        value="no"
                        checked={formData.authorizedToWork === 'no'}
                        onChange={(e) => {
                          handleInputChange(e);
                          setTimeout(() => authorizedToWorkAutoSave.saveField(), 300);
                        }}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {errors.authorizedToWork && (
                    <p className="text-red-500 text-sm mt-1">{errors.authorizedToWork}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Will you require visa sponsorship now or in the future? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="requiresSponsorship"
                        value="yes"
                        checked={formData.requiresSponsorship === 'yes'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="requiresSponsorship"
                        value="no"
                        checked={formData.requiresSponsorship === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {errors.requiresSponsorship && (
                    <p className="text-red-500 text-sm mt-1">{errors.requiresSponsorship}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Are you 18 years of age or older? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="over18"
                        value="yes"
                        checked={formData.over18 === 'yes'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="over18"
                        value="no"
                        checked={formData.over18 === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {errors.over18 && (
                    <p className="text-red-500 text-sm mt-1">{errors.over18}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Have you ever been convicted of a felony? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="felonyConviction"
                        value="yes"
                        checked={formData.felonyConviction === 'yes'}
                        onChange={(e) => {
                          handleInputChange(e);
                          setTimeout(() => felonyConvictionAutoSave.saveField(), 300);
                        }}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="felonyConviction"
                        value="no"
                        checked={formData.felonyConviction === 'no'}
                        onChange={(e) => {
                          handleInputChange(e);
                          setTimeout(() => felonyConvictionAutoSave.saveField(), 300);
                        }}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {errors.felonyConviction && (
                    <p className="text-red-500 text-sm mt-1">{errors.felonyConviction}</p>
                  )}
                </div>

                {formData.felonyConviction === 'yes' && (
                  <div>
                    <label className="form-label">
                      Please explain <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="felonyExplanation"
                      value={formData.felonyExplanation}
                      onChange={handleInputChange}
                      required={formData.felonyConviction === 'yes'}
                      rows={3}
                      className="input"
                      placeholder="Please provide details..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Note: A conviction record will not necessarily disqualify you from employment.
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="backgroundCheckConsent"
                      checked={formData.backgroundCheckConsent === 'yes'}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          backgroundCheckConsent: e.target.checked ? 'yes' : ''
                        }));
                        setTimeout(() => backgroundCheckConsentAutoSave.saveField(), 300);
                      }}
                      required
                      className="mr-3 mt-1"
                    />
                    <span className="text-sm text-gray-700">
                      I authorize Hartzell to conduct a background check and verify the information provided in this application. <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>

                <hr className="my-6" />

                {/* Additional Information Section */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label">
                        How did you hear about this position?
                      </label>
                      <div className="relative">
                        <select
                          name="howDidYouHear"
                          value={formData.howDidYouHear}
                          onChange={handleInputChange}
                          onBlur={howDidYouHearAutoSave.saveField}
                          className="input"
                        >
                          <option value="">Select...</option>
                          <option value="Indeed">Indeed</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Company Website">Company Website</option>
                          <option value="Employee Referral">Employee Referral</option>
                          <option value="Job Fair">Job Fair</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="form-label">
                        Additional Comments
                      </label>
                      <textarea
                        name="additionalInfo"
                        value={formData.additionalInfo}
                        onChange={handleInputChange}
                        rows={4}
                        className="input"
                        placeholder="Is there anything else you'd like us to know about your application?"
                      />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        <strong>Important:</strong> By submitting this application, you certify that all information provided is true and complete to the best of your knowledge. Any false or misleading information may result in disqualification from employment or termination if employed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* REMOVED OLD STEP 6 - Now integrated into Step 5 above */}
            {step === 99 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6 bg-white rounded-lg p-4 shadow-sm border-l-4 border-hartzell-blue">
                  <div className="w-12 h-12 bg-hartzell-blue rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Additional Information</h2>
                </div>

                {files.resume && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700">
                      ✓ <strong>Resume uploaded:</strong> {files.resume.name}
                    </p>
                  </div>
                )}


                <div>
                  <label className="form-label">
                    How did you hear about this position?
                  </label>
                  <select
                    name="howDidYouHear"
                    value={formData.howDidYouHear}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="">Select...</option>
                    <option value="Indeed">Indeed</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Company Website">Company Website</option>
                    <option value="Employee Referral">Employee Referral</option>
                    <option value="Job Fair">Job Fair</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Additional Information
                  </label>
                  <textarea
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    rows={4}
                    className="input"
                    placeholder="Is there anything else you'd like us to know about your application?"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-gray-700">
                    <strong>Important:</strong> By submitting this application, you certify that all information provided is true and complete to the best of your knowledge. Any false or misleading information may result in disqualification from employment or termination if employed.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
              ) : (
                <div></div>
              )}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={() => {
                    const validation = validateStep(step);
                    if (validation.valid) {
                      // Clear errors for this step
                      setErrors({});
                      setStep(step + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      // Set errors to highlight fields with red borders
                      setErrors(validation.errors);

                      // Scroll to first invalid field
                      if (validation.firstInvalidField) {
                        const element = document.querySelector(`[name="${validation.firstInvalidField}"]`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Focus the field
                          (element as HTMLElement).focus();
                        }
                      }
                    }
                  }}
                  className="btn btn-primary"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* CAPTCHA Gate Modal */}
      {showCaptchaGate && (
        <CaptchaGate
          onVerified={handleCaptchaVerified}
          onClose={() => router.push('/')}
        />
      )}

      {/* Duplicate Detection Modal */}
      {duplicate && duplicate.exists && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Application Already Started
                </h3>
                <p className="text-gray-700 mb-4">
                  {duplicate.status === 'incomplete'
                    ? "You have an incomplete application. Would you like to continue where you left off?"
                    : "You have already submitted an application with this email address."}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {duplicate.status === 'incomplete' && duplicate.applicationId && (
                <button
                  onClick={() => {
                    // Resume the draft
                    sessionStorage.setItem('draftId', duplicate.applicationId);
                    clearDuplicate();
                    window.location.reload();
                  }}
                  className="btn-primary flex-1"
                >
                  Resume Application
                </button>
              )}
              <button
                onClick={() => {
                  // Clear everything for a fresh start
                  if (duplicate.status === 'incomplete') {
                    sessionStorage.removeItem('draftId');
                    sessionStorage.removeItem('verifiedEmail');
                  }
                  clearDuplicate();
                  // Reload to reset form completely
                  if (duplicate.status === 'incomplete') {
                    window.location.reload();
                  }
                }}
                className={`flex-1 ${duplicate.status === 'incomplete' ? 'btn-outline' : 'btn-primary'}`}
              >
                {duplicate.status === 'incomplete' ? 'Start Fresh' : 'OK'}
              </button>
            </div>

            {duplicate.status === 'submitted' && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                If you need to update your application, please contact us directly.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
