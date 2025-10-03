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
  sessionToken?: string;
  session?: SessionData & { sessionId: string };
  error?: string;
}

export interface VerifySSNRequest {
  preAuthSession: string;
  ssnLast4: string;
}

export interface VerifySSNResponse {
  success: boolean;
  sessionToken?: string;
  session: SessionData & { sessionId: string };
  error?: string;
}

// Employee Profile
export interface EmployeeProfile {
  id: number;
  bitrixId: number;
  badgeNumber: string;
  fullName: string;
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
  workLocation?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

// Documents
export interface Document {
  id: string;
  title: string;
  type: 'pdf' | 'image' | 'word' | 'other';
  category: 'personal' | 'benefits' | 'payroll' | 'policy' | 'signature_required';
  uploadedAt: string;
  uploadedBy?: string;
  url?: string;
  requiresSignature: boolean;
  signatureStatus?: 'pending' | 'signed' | 'expired';
  signatureRequestId?: string;
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
