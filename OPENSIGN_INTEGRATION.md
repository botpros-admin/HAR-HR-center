# OpenSign Integration Plan - Hartzell HR Center

**Platform:** OpenSign™ (Open Source E-Signature)
**Environment:** Sandbox (Testing)
**API Token:** `test.keNN7hbRY40lf9z7GLzd9`

---

## Overview

OpenSign is an open-source alternative to DocuSign that provides secure electronic signature capabilities. We'll integrate OpenSign for all digital signature requirements across the HR Center.

---

## Use Cases in HR Center

### 1. **Recruitment Pipeline**
- ✍️ Offer Letter Signature
- ✍️ Non-Disclosure Agreement (NDA)
- ✍️ Non-Compete Agreement

### 2. **Onboarding Pipeline**
- ✍️ Background Check Authorization (FCRA disclosure)
- ✍️ Employee Handbook Acknowledgment
- ✍️ W-4 Form Certification
- ✍️ I-9 Form Verification
- ✍️ Direct Deposit Authorization
- ✍️ Benefits Enrollment Forms
- ✍️ Safety Training Acknowledgment
- ✍️ Property Receipt Acknowledgment

### 3. **Performance Management**
- ✍️ Performance Review Sign-off (Employee + Manager)
- ✍️ Performance Improvement Plan (PIP)
- ✍️ Promotion Letters

### 4. **Disciplinary Actions**
- ✍️ Disciplinary Action Form (Employee + Supervisor)
- ✍️ Corrective Action Plan Acknowledgment
- ✍️ Final Warning Documentation

### 5. **Offboarding**
- ✍️ Termination Letter Acknowledgment
- ✍️ Property Return Confirmation
- ✍️ Exit Interview Agreement
- ✍️ Final Paycheck Receipt

---

## OpenSign Configuration

### Environment Setup

```typescript
// lib/opensign/config.ts
export const OPENSIGN_CONFIG = {
  sandbox: {
    baseUrl: "https://api.opensignlabs.com/v1",
    apiToken: "test.keNN7hbRY40lf9z7GLzd9",
    webhookSecret: process.env.OPENSIGN_WEBHOOK_SECRET
  },
  production: {
    baseUrl: "https://api.opensignlabs.com/v1",
    apiToken: process.env.OPENSIGN_PROD_API_TOKEN,
    webhookSecret: process.env.OPENSIGN_WEBHOOK_SECRET
  }
};

export const getOpenSignConfig = () => {
  const env = process.env.NODE_ENV === "production" ? "production" : "sandbox";
  return OPENSIGN_CONFIG[env];
};
```

### Environment Variables

```env
# .env.local
OPENSIGN_ENV=sandbox
OPENSIGN_SANDBOX_API_TOKEN=test.keNN7hbRY40lf9z7GLzd9
OPENSIGN_PROD_API_TOKEN=<production-token-when-ready>
OPENSIGN_WEBHOOK_SECRET=<generate-secure-secret>
OPENSIGN_WEBHOOK_URL=https://your-domain.com/api/webhooks/opensign
```

---

## OpenSign API Client

### Base Client Implementation

```typescript
// lib/opensign/client.ts
import { getOpenSignConfig } from "./config";

export class OpenSignClient {
  private config = getOpenSignConfig();

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.config.apiToken}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new OpenSignError(error.message, response.status);
    }

    return response.json();
  }

  // Create a signature request
  async createSignatureRequest(data: SignatureRequestData): Promise<SignatureRequest> {
    return this.request("/signature-requests", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  // Get signature request status
  async getSignatureRequest(id: string): Promise<SignatureRequest> {
    return this.request(`/signature-requests/${id}`);
  }

  // Cancel signature request
  async cancelSignatureRequest(id: string): Promise<void> {
    await this.request(`/signature-requests/${id}/cancel`, {
      method: "POST"
    });
  }

  // Upload document
  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.config.baseUrl}/documents`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiToken}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error("Failed to upload document");
    }

    return response.json();
  }

  // Download signed document
  async downloadSignedDocument(requestId: string): Promise<Blob> {
    const response = await fetch(
      `${this.config.baseUrl}/signature-requests/${requestId}/download`,
      {
        headers: {
          "Authorization": `Bearer ${this.config.apiToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download signed document");
    }

    return response.blob();
  }

  // Create template
  async createTemplate(data: TemplateData): Promise<Template> {
    return this.request("/templates", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  // Send from template
  async sendFromTemplate(
    templateId: string,
    signers: Signer[]
  ): Promise<SignatureRequest> {
    return this.request(`/templates/${templateId}/send`, {
      method: "POST",
      body: JSON.stringify({ signers })
    });
  }
}

class OpenSignError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "OpenSignError";
  }
}
```

---

## TypeScript Types

```typescript
// lib/opensign/types.ts

export interface Signer {
  name: string;
  email: string;
  role: "signer" | "approver" | "cc";
  order?: number; // For sequential signing
  requireOTP?: boolean;
}

export interface SignatureField {
  type: "signature" | "initial" | "text" | "date" | "checkbox";
  page: number;
  x: number; // X coordinate
  y: number; // Y coordinate
  width: number;
  height: number;
  required: boolean;
  signerEmail: string;
}

export interface SignatureRequestData {
  title: string;
  message?: string;
  documentId?: string; // If document already uploaded
  documentUrl?: string; // Or provide URL
  signers: Signer[];
  fields?: SignatureField[];
  expiresAt?: string; // ISO date
  reminder?: {
    enabled: boolean;
    frequency: "daily" | "weekly";
  };
  metadata?: Record<string, any>; // Custom data
}

export interface SignatureRequest {
  id: string;
  title: string;
  status: "pending" | "signed" | "declined" | "expired" | "cancelled";
  createdAt: string;
  expiresAt?: string;
  documentId: string;
  signers: SignerStatus[];
  signedDocumentUrl?: string;
}

export interface SignerStatus {
  email: string;
  name: string;
  status: "pending" | "signed" | "declined";
  signedAt?: string;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface Template {
  id: string;
  name: string;
  documentId: string;
  fields: SignatureField[];
  createdAt: string;
}

export interface TemplateData {
  name: string;
  documentId: string;
  fields: SignatureField[];
  defaultSigners?: Signer[];
}

export interface WebhookEvent {
  event: "signature_request.signed" | "signature_request.declined" | "signature_request.expired";
  timestamp: string;
  signatureRequest: SignatureRequest;
}
```

---

## Document Templates

### Pre-configured Templates

We'll create templates for common documents with signature fields pre-positioned:

```typescript
// lib/opensign/templates.ts

export const HR_TEMPLATES = {
  OFFER_LETTER: "tpl_offer_letter",
  NDA: "tpl_nda",
  BACKGROUND_CHECK_AUTH: "tpl_background_check",
  HANDBOOK_ACK: "tpl_handbook",
  PROPERTY_RECEIPT: "tpl_property_receipt",
  PERFORMANCE_REVIEW: "tpl_performance_review",
  DISCIPLINARY_ACTION: "tpl_disciplinary_action",
  TERMINATION_LETTER: "tpl_termination"
};

// Template field positions (example for offer letter)
export const OFFER_LETTER_FIELDS: SignatureField[] = [
  {
    type: "signature",
    page: 1,
    x: 100,
    y: 700,
    width: 200,
    height: 50,
    required: true,
    signerEmail: "{{employee_email}}" // Placeholder
  },
  {
    type: "date",
    page: 1,
    x: 320,
    y: 700,
    width: 100,
    height: 30,
    required: true,
    signerEmail: "{{employee_email}}"
  },
  {
    type: "signature",
    page: 1,
    x: 100,
    y: 650,
    width: 200,
    height: 50,
    required: true,
    signerEmail: "{{hr_email}}"
  }
];
```

---

## Workflow Integration

### Example: Offer Letter Signature

```typescript
// app/api/recruitment/send-offer/route.ts
import { OpenSignClient } from "@/lib/opensign/client";
import { Bitrix24Client } from "@/lib/bitrix24/client";

export async function POST(request: Request) {
  const { applicantId, offerDetails } = await request.json();

  const opensign = new OpenSignClient();
  const bitrix = new Bitrix24Client();

  // 1. Get applicant data
  const applicant = await bitrix.getEmployee(applicantId);

  // 2. Generate offer letter PDF
  const offerPdf = await generateOfferLetterPDF(applicant, offerDetails);

  // 3. Upload to OpenSign
  const document = await opensign.uploadDocument(offerPdf);

  // 4. Create signature request
  const signatureRequest = await opensign.createSignatureRequest({
    title: `Offer Letter - ${applicant.ufCrm6Name} ${applicant.ufCrm6LastName}`,
    message: "Please review and sign your offer letter.",
    documentId: document.id,
    signers: [
      {
        name: `${applicant.ufCrm6Name} ${applicant.ufCrm6LastName}`,
        email: applicant.ufCrm6Email[0],
        role: "signer",
        order: 1,
        requireOTP: true // Email OTP for security
      },
      {
        name: "HR Manager",
        email: "hr@hartzell.com",
        role: "signer",
        order: 2
      }
    ],
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    reminder: {
      enabled: true,
      frequency: "daily"
    },
    metadata: {
      applicantId,
      entityType: "offer_letter",
      bitrixEntityId: applicant.id
    }
  });

  // 5. Store OpenSign request ID in Bitrix24
  await bitrix.updateEmployee(applicantId, {
    ufCrm6OfferLetterSignatureId: signatureRequest.id,
    ufCrm6OfferLetterStatus: "pending_signature"
  });

  return Response.json({
    success: true,
    signatureRequestId: signatureRequest.id
  });
}
```

---

## Webhook Handler

### Handle Signature Events

```typescript
// app/api/webhooks/opensign/route.ts
import { OpenSignClient } from "@/lib/opensign/client";
import { Bitrix24Client } from "@/lib/bitrix24/client";
import { WebhookEvent } from "@/lib/opensign/types";

export async function POST(request: Request) {
  const signature = request.headers.get("X-OpenSign-Signature");
  const body = await request.text();

  // Verify webhook signature
  if (!verifyWebhookSignature(body, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event: WebhookEvent = JSON.parse(body);

  const opensign = new OpenSignClient();
  const bitrix = new Bitrix24Client();

  switch (event.event) {
    case "signature_request.signed": {
      // All parties have signed
      const { signatureRequest } = event;
      const { applicantId, entityType } = signatureRequest.metadata;

      // Download signed document
      const signedPdf = await opensign.downloadSignedDocument(signatureRequest.id);

      // Upload to Bitrix24
      const fileId = await bitrix.uploadFile(
        applicantId,
        new File([signedPdf], `${entityType}_signed.pdf`),
        "ufCrm6HiringPaperwork"
      );

      // Update employee record
      await bitrix.updateEmployee(applicantId, {
        ufCrm6OfferLetterStatus: "signed",
        ufCrm6OfferLetterSignedDate: new Date().toISOString()
      });

      // Move to next stage if offer letter
      if (entityType === "offer_letter") {
        await bitrix.moveStage(applicantId, "DT1054_10:NEW"); // Move to Onboarding
      }

      // Send notification
      await sendEmail({
        to: "hr@hartzell.com",
        subject: `${entityType} signed by ${signatureRequest.signers[0].name}`,
        body: "Document has been signed by all parties."
      });

      break;
    }

    case "signature_request.declined": {
      // Signature declined
      const { signatureRequest } = event;
      const { applicantId } = signatureRequest.metadata;

      await bitrix.updateEmployee(applicantId, {
        ufCrm6OfferLetterStatus: "declined"
      });

      // Notify HR
      await sendEmail({
        to: "hr@hartzell.com",
        subject: "Offer letter declined",
        body: `${signatureRequest.signers[0].name} declined the offer.`
      });

      break;
    }

    case "signature_request.expired": {
      // Signature request expired
      const { signatureRequest } = event;
      const { applicantId } = signatureRequest.metadata;

      await bitrix.updateEmployee(applicantId, {
        ufCrm6OfferLetterStatus: "expired"
      });

      // Notify HR
      await sendEmail({
        to: "hr@hartzell.com",
        subject: "Offer letter expired",
        body: `Offer letter for ${signatureRequest.signers[0].name} has expired.`
      });

      break;
    }
  }

  return Response.json({ received: true });
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;

  const crypto = require("crypto");
  const secret = process.env.OPENSIGN_WEBHOOK_SECRET;
  const hash = crypto.createHmac("sha256", secret).update(body).digest("hex");

  return hash === signature;
}
```

---

## UI Components

### Signature Request Button

```typescript
// components/opensign/SignatureRequestButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSignature } from "lucide-react";

interface Props {
  documentType: string;
  applicantId: number;
  onSuccess?: () => void;
}

export function SignatureRequestButton({ documentType, applicantId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSendForSignature = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/signatures/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, applicantId })
      });

      if (!response.ok) throw new Error("Failed to send");

      const { signatureRequestId } = await response.json();

      toast.success("Signature request sent!");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to send signature request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleSendForSignature} disabled={loading}>
      <FileSignature className="w-4 h-4 mr-2" />
      {loading ? "Sending..." : "Send for Signature"}
    </Button>
  );
}
```

### Signature Status Badge

```typescript
// components/opensign/SignatureStatusBadge.tsx
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface Props {
  status: "pending" | "signed" | "declined" | "expired";
}

export function SignatureStatusBadge({ status }: Props) {
  const config = {
    pending: {
      label: "Pending Signature",
      variant: "secondary" as const,
      icon: Clock
    },
    signed: {
      label: "Signed",
      variant: "success" as const,
      icon: CheckCircle
    },
    declined: {
      label: "Declined",
      variant: "destructive" as const,
      icon: XCircle
    },
    expired: {
      label: "Expired",
      variant: "outline" as const,
      icon: XCircle
    }
  };

  const { label, variant, icon: Icon } = config[status];

  return (
    <Badge variant={variant}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}
```

---

## Testing with Sandbox

### Test Workflow

```typescript
// tests/opensign.test.ts
import { OpenSignClient } from "@/lib/opensign/client";

describe("OpenSign Integration", () => {
  const client = new OpenSignClient();

  it("should create signature request", async () => {
    const request = await client.createSignatureRequest({
      title: "Test Document",
      documentUrl: "https://example.com/test.pdf",
      signers: [
        {
          name: "Test Employee",
          email: "test@example.com",
          role: "signer"
        }
      ]
    });

    expect(request.id).toBeDefined();
    expect(request.status).toBe("pending");
  });

  it("should get signature request status", async () => {
    const requestId = "test_request_123";
    const request = await client.getSignatureRequest(requestId);

    expect(request.id).toBe(requestId);
  });
});
```

---

## Security Considerations

### Best Practices

1. **API Token Security**
   - Store in environment variables
   - Never commit to Git
   - Rotate regularly
   - Use different tokens for sandbox/production

2. **Webhook Verification**
   - Always verify signature
   - Use HTTPS only
   - Validate payload structure
   - Rate limit webhook endpoint

3. **Document Storage**
   - Store signed documents in Bitrix24
   - Maintain audit trail
   - Implement retention policy
   - Encrypt sensitive documents

4. **Signer Authentication**
   - Use OTP for sensitive documents
   - Verify signer identity
   - Track IP addresses
   - Log all signature events

---

## Migration Plan

### Phase 1: Setup (Week 1)
- [ ] Create OpenSign account
- [ ] Get sandbox API token ✅
- [ ] Configure webhook endpoint
- [ ] Create document templates

### Phase 2: Integration (Week 2-3)
- [ ] Build OpenSign client
- [ ] Implement signature workflows
- [ ] Create UI components
- [ ] Test with sandbox

### Phase 3: Production (Week 4)
- [ ] Get production API token
- [ ] Configure production webhooks
- [ ] Migrate templates
- [ ] Go live

---

## Monitoring & Maintenance

### Metrics to Track

- Signature requests sent
- Signature completion rate
- Average time to sign
- Declined signatures
- Expired signatures
- Failed webhook deliveries

### Alerts

- Failed signature requests
- Webhook failures
- API rate limits
- Expired documents
- Declined signatures

---

*OpenSign integration will provide secure, auditable e-signature capabilities across all HR workflows.*
