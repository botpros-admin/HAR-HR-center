import type {
  LoginRequest,
  LoginResponse,
  VerifySSNRequest,
  VerifySSNResponse,
  SessionData,
  EmployeeProfile,
  Document,
  SignatureRequest,
  PendingTask,
  DashboardSummary,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hartzell.work/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get session token from localStorage
    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add Authorization header if session token exists
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Still include for backwards compatibility
    });

    const data = await response.json().catch(() => ({
      error: 'Request failed',
    }));

    if (!response.ok) {
      // Throw an error with the full response data
      const error: any = new Error(data.error || `HTTP ${response.status}`);
      error.response = data; // Preserve the full response (e.g., requiresCaptcha)
      throw error;
    }

    return data;
  }

  // Authentication
  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifySSN(data: VerifySSNRequest): Promise<VerifySSNResponse> {
    return this.request<VerifySSNResponse>('/auth/verify-ssn', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getSession(): Promise<{ valid: boolean; session?: SessionData }> {
    try {
      return await this.request<{ valid: boolean; session?: SessionData }>(
        '/auth/session'
      );
    } catch (err) {
      // 401 is expected when not logged in - return invalid session instead of throwing
      return { valid: false };
    }
  }

  // Employee
  async getProfile(): Promise<EmployeeProfile> {
    return this.request<EmployeeProfile>('/employee/profile');
  }

  async updateProfile(field: string, value: any): Promise<EmployeeProfile> {
    return this.request<EmployeeProfile>('/employee/profile', {
      method: 'PUT',
      body: JSON.stringify({ field, value }),
    });
  }

  async getDashboard(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/employee/dashboard');
  }

  async getTasks(): Promise<PendingTask[]> {
    return this.request<PendingTask[]>('/employee/tasks');
  }

  async getDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/employee/documents');
  }

  // Signatures
  async getPendingSignatures(): Promise<SignatureRequest[]> {
    return this.request<SignatureRequest[]>('/signatures/pending');
  }

  async getSignatureUrl(requestId: string): Promise<{ url: string }> {
    return this.request<{ url: string }>(`/signatures/${requestId}/url`);
  }
}

export const api = new ApiClient();
