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

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important for cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Request failed',
      }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
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
    return this.request<{ valid: boolean; session?: SessionData }>(
      '/auth/session'
    );
  }

  // Employee
  async getProfile(): Promise<EmployeeProfile> {
    return this.request<EmployeeProfile>('/employee/profile');
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
