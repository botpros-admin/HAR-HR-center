// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Session & Authentication
export interface SessionData {
  employeeId: number;
  bitrixId: number;
  badgeNumber: string;
  name: string;
  email: string;
  role: 'employee' | 'hr_admin';
}

export interface LoginRequest {
  employeeId: string;
  dateOfBirth: string;
  turnstileToken?: string;
}

export interface LoginResponse {
  success: boolean;
  requiresSSN: boolean;
  requiresCaptcha?: boolean;
  failedAttempts?: number;
  preAuthSession?: string;
  session?: SessionData & { id: string };
  error?: string;
}

export interface VerifySSNRequest {
  preAuthSession: string;
  ssnLast4: string;
}

export interface VerifySSNResponse {
  success: boolean;
  session: SessionData & { id: string };
  error?: string;
}

// Employee Profile
export interface EmployeeProfile {
  id: number;
  bitrixId: number;
  badgeNumber: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  preferredName?: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  hireDate?: string;
  department?: string;
  position?: string;
  manager?: string;
  employmentStatus: string;
  employmentType?: string;
  shift?: string;
  workLocation?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  // Education
  education?: {
    level: string | null;
    school: string | null;
    graduationYear: string | null;
    fieldOfStudy: string | null;
  };

  // Skills & Certifications
  skills?: string | null;
  certifications?: string | null;
  softwareExperience?: string | null;

  // Work Experience
  workExperiences?: Array<{
    employer: string;
    position: string;
    startDate: string;
    endDate?: string;
    currentlyWorking?: boolean;
    description?: string;
  }>;
  yearsExperience?: string | null;

  // References
  references?: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;

  // Documents
  documents?: {
    resumeUrl: string | null;
    coverLetterUrl: string | null;
    applicationId: string | null;
    submittedAt: string | null;
  };

  // Additional application data
  desiredSalary?: string | null;
  availableStartDate?: string | null;
  willingToRelocate?: boolean | null;
  authorizedToWork?: boolean | null;
  requiresSponsorship?: boolean | null;
  howDidYouHear?: string | null;
}

// Documents
export interface Document {
  id: number;
  templateId: string;
  title: string;
  description?: string;
  type?: 'pdf' | 'image' | 'word' | 'other';
  category: 'onboarding' | 'tax' | 'benefits' | 'policy' | 'other';
  status: 'assigned' | 'sent' | 'signed' | 'expired' | 'declined';
  priority: 'high' | 'medium' | 'low';
  requiresSignature: boolean;
  signatureStatus?: 'pending' | 'signed' | 'expired' | 'declined';
  signatureUrl?: string | null;
  signatureRequestId?: string | null;
  templateUrl: string;
  fileName: string;
  fieldPositions?: string | null;
  signedDocumentUrl?: string | null;
  dueDate?: string | null;
  assignedAt: string;
  signedAt?: string | null;
  uploadedAt?: string; // For backwards compatibility
  uploadedBy?: string;
  url?: string;
  // Computed fields
  needsAttention: boolean;
  isUrgent: boolean;
  isComplete: boolean;
  isExpired: boolean;
}

// Signature Requests
export interface SignatureRequest {
  id: string;
  documentId: string;
  documentName: string;
  status: 'pending' | 'signed' | 'declined' | 'expired';
  requestedAt: string;
  signedAt?: string;
  expiresAt?: string;
  opensignUrl?: string;
  priority: 'high' | 'medium' | 'low';
}

// Tasks
export interface PendingTask {
  id: string;
  title: string;
  description: string;
  type: 'document_upload' | 'form_completion' | 'signature_required' | 'review_required' | 'action_required';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: {
    documentId?: string;
    formId?: string;
    signatureRequestId?: string;
    [key: string]: any;
  };
}

// Dashboard Summary
export interface DashboardSummary {
  pendingSignatures: number;
  pendingTasks: number;
  recentDocuments: number;
  profileComplete: number;
}

// Rate Limit Response
export interface RateLimitResponse {
  allowed: boolean;
  requiresCaptcha: boolean;
  blockedUntil?: string;
  attemptsRemaining?: number;
}
