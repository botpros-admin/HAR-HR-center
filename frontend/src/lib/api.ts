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
  private csrfToken: string | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  // Set CSRF token (called after login)
  setCsrfToken(token: string) {
    this.csrfToken = token;
  }

  // Get CSRF token
  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add CSRF token for state-changing requests
    if (this.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Send cookies with requests (HttpOnly session cookie)
    });

    const data = await response.json().catch(() => ({
      error: 'Request failed',
    }));

    // Update CSRF token if provided in response
    if (data.csrfToken) {
      this.setCsrfToken(data.csrfToken);
    }

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
    // Add timestamp to force cache busting
    return this.request<EmployeeProfile>(`/employee/profile?_t=${Date.now()}`);
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

  async createSignatureRequest(data: {
    documentType: string;
    documentTitle: string;
  }): Promise<{ signatureUrl: string; requestId: string }> {
    return this.request<{ signatureUrl: string; requestId: string }>(
      '/signatures/create',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // Admin - Employees
  async getEmployees(): Promise<{ employees: any[] }> {
    return this.request<{ employees: any[] }>('/admin/employees');
  }

  async refreshEmployees(): Promise<{ success: boolean; count: number; message: string }> {
    return this.request<{ success: boolean; count: number; message: string }>('/admin/employees/refresh', {
      method: 'POST',
    });
  }

  async getEmployeeDetails(bitrixId: number): Promise<{ employee: any }> {
    return this.request<{ employee: any }>(`/admin/employee/${bitrixId}`);
  }

  async updateEmployee(bitrixId: number, updates: Record<string, any>): Promise<{ success: boolean; message: string; employee: any }> {
    return this.request<{ success: boolean; message: string; employee: any }>(`/admin/employee/${bitrixId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Admin - Templates
  async getTemplates(params?: { category?: string; active_only?: boolean }): Promise<{ templates: any[] }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.active_only) searchParams.set('active_only', 'true');
    const query = searchParams.toString();
    return this.request<{ templates: any[] }>(`/admin/templates${query ? '?' + query : ''}`);
  }

  async uploadTemplate(formData: FormData): Promise<{ success: boolean; template: any }> {
    // For file uploads, don't set Content-Type header (browser will set it with boundary)
    const url = `${this.baseUrl}/admin/templates`;

    const headers: Record<string, string> = {};

    // Add CSRF token for POST request
    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({
      error: 'Upload failed',
    }));

    if (!response.ok) {
      const error: any = new Error(data.error || `HTTP ${response.status}`);
      error.response = data;
      throw error;
    }

    return data;
  }

  async deleteTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/templates/${templateId}`, {
      method: 'DELETE',
    });
  }

  async updateTemplateFields(templateId: string, fieldPositions: any[]): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/templates/${templateId}/fields`, {
      method: 'PUT',
      body: JSON.stringify({ fieldPositions }),
    });
  }

  // Admin - Assignments
  async getAssignments(params?: { status?: string; employee_id?: string }): Promise<{ assignments: any[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
    const query = searchParams.toString();
    return this.request<{ assignments: any[] }>(`/admin/assignments${query ? '?' + query : ''}`);
  }

  async createAssignment(data: {
    templateId: string;
    employeeIds: number[];
    priority?: string;
    dueDate?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; assignments: any[] }> {
    return this.request<{ success: boolean; message: string; assignments: any[] }>('/admin/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAssignment(assignmentId: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/admin/assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
