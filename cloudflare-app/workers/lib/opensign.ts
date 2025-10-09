/**
 * OpenSign API Client for Cloudflare Workers
 * Handles document signature requests via OpenSign
 */

import type { Env } from '../types';

interface OpenSignTemplate {
  id: string;
  name: string;
  description?: string;
}

interface OpenSignSignatureRequest {
  id: string;
  templateId: string;
  signers: Array<{
    email: string;
    name: string;
    role: string;
  }>;
  status: 'pending' | 'completed' | 'declined' | 'expired';
  signUrl: string;
  documentUrl?: string;
  createdAt: string;
  completedAt?: string;
}

interface CreateSignatureRequestParams {
  templateId: string;
  documentTitle: string;
  signerEmail: string;
  signerName: string;
  metadata?: Record<string, any>;
}

interface CreateSignatureRequestFromPDFParams {
  pdfBuffer: ArrayBuffer;
  fileName: string;
  documentTitle: string;
  signerEmail: string;
  signerName: string;
  fieldPositions?: any[] | null;
  metadata?: Record<string, any>;
}

export class OpenSignClient {
  private baseUrl: string;
  private apiToken: string;

  constructor(private env: Env) {
    const isSandbox = env.OPENSIGN_ENV === 'sandbox';
    this.baseUrl = isSandbox
      ? 'https://sandbox.opensignlabs.com/api/v1.1' // OpenSign sandbox API
      : 'https://app.opensignlabs.com/api/v1.1'; // OpenSign production API
    this.apiToken = env.OPENSIGN_API_TOKEN;
  }

  /**
   * Create a signature request from a template
   */
  async createSignatureRequest(params: CreateSignatureRequestParams): Promise<OpenSignSignatureRequest> {
    const response = await this.request<{ data: OpenSignSignatureRequest }>('/signature-requests', {
      method: 'POST',
      body: JSON.stringify({
        template_id: params.templateId,
        title: params.documentTitle,
        signers: [
          {
            email: params.signerEmail,
            name: params.signerName,
            role: 'signer',
            order: 1
          }
        ],
        metadata: params.metadata || {},
        send_email: true // Automatically send email to signer
      })
    });

    return response.data;
  }

  /**
   * Get signature request details
   */
  async getSignatureRequest(requestId: string): Promise<OpenSignSignatureRequest> {
    const response = await this.request<{ data: OpenSignSignatureRequest }>(
      `/signature-requests/${requestId}`
    );
    return response.data;
  }

  /**
   * Download signed document PDF
   */
  async downloadSignedDocument(requestId: string): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/signature-requests/${requestId}/download`;

    const response = await fetch(url, {
      headers: {
        'x-api-token': this.apiToken,
        'Accept': 'application/pdf'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * List available templates
   */
  async listTemplates(): Promise<OpenSignTemplate[]> {
    const response = await this.request<{ data: OpenSignTemplate[] }>('/templates');
    return response.data;
  }

  /**
   * Cancel a signature request
   */
  async cancelSignatureRequest(requestId: string): Promise<void> {
    await this.request(`/signature-requests/${requestId}/cancel`, {
      method: 'POST'
    });
  }

  /**
   * Send reminder email for pending signature
   */
  async sendReminder(requestId: string): Promise<void> {
    await this.request(`/signature-requests/${requestId}/remind`, {
      method: 'POST'
    });
  }

  /**
   * Create a signature request by uploading a PDF document
   * This is used when we have our own PDF files (from R2) rather than OpenSign templates
   * OpenSign expects JSON with base64-encoded PDF
   */
  async createSignatureRequestFromPDF(params: CreateSignatureRequestFromPDFParams): Promise<OpenSignSignatureRequest> {
    // Convert ArrayBuffer to base64 (chunk to avoid stack overflow)
    const uint8Array = new Uint8Array(params.pdfBuffer);
    let binaryString = '';
    const chunkSize = 8192; // Process 8KB at a time

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }

    const base64Pdf = btoa(binaryString);

    // Helper function to generate random ID (matching OpenSign format)
    const generateRandomId = () => {
      return Math.random().toString(36).substring(2, 15);
    };

    // Transform field positions to OpenSign widget format
    // NOTE: OpenSign API uses lowercase property names (x, y, w, h) NOT (xPosition, yPosition, Width, Height)
    // The capitalized names are only used in the frontend PlaceHolderSign.jsx component
    const transformedWidgets = (params.fieldPositions || []).map((field: any) => {
      const widget: any = {
        type: field.type,
        page: field.page || 1,
        x: field.x || 0,
        y: field.y || 0,
        w: field.width || field.w || 100,
        h: field.height || field.h || 50,
        options: {
          name: field.label || field.name || field.type,
          required: field.required !== undefined ? field.required : true
        }
      };

      // Add type-specific options
      if (field.type === 'date') {
        widget.options.format = 'mm/dd/yyyy';
      } else if (field.type === 'checkbox') {
        widget.options.values = [field.label || 'Option'];
        widget.options.selectedvalues = [];
      }

      return widget;
    });

    // Prepare JSON payload with base64-encoded PDF
    const payload: any = {
      file: base64Pdf,
      title: params.documentTitle,
      signers: [
        {
          email: params.signerEmail,
          name: params.signerName,
          role: 'signer',
          widgets: transformedWidgets  // Use transformed widgets
        }
      ],
      send_email: true  // Boolean, not string
    };

    // Add metadata if provided
    if (params.metadata) {
      payload.metadata = params.metadata;
    }

    const url = `${this.baseUrl}/createdocument`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-token': this.apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[OpenSign] Error response body:`, errorText.substring(0, 500));
      throw new Error(`Failed to upload document to OpenSign: ${response.status} - ${errorText}`);
    }

    // Parse OpenSign response (not wrapped in data object)
    const result = await response.json() as {
      objectId: string;
      signurl: Array<{ email: string; url: string }>;
      message: string;
    };

    // Transform to expected format
    const transformedResult: OpenSignSignatureRequest = {
      id: result.objectId,
      templateId: params.documentTitle, // We don't have template ID for uploaded PDFs
      signers: [{
        email: params.signerEmail,
        name: params.signerName,
        role: 'signer'
      }],
      status: 'pending',
      signUrl: result.signurl[0]?.url || '',
      createdAt: new Date().toISOString()
    };

    return transformedResult;
  }

  /**
   * Make authenticated request to OpenSign API
   */
  private async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'x-api-token': this.apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`OpenSign API error [${response.status}]:`, errorText);
      throw new Error(`OpenSign API request failed: ${response.status} - ${errorText}`);
    }

    // Handle empty responses (e.g., 204 No Content)
    if (response.status === 204 || response.headers.get('Content-Length') === '0') {
      return {} as T;
    }

    return await response.json() as T;
  }
}
