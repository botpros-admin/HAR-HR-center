# Hartzell HR Center - Technical Specification

**Version:** 1.0
**Last Updated:** October 3, 2025
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Data Model](#data-model)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Module Specifications](#module-specifications)
6. [API Integration](#api-integration)
7. [Security & Compliance](#security--compliance)
8. [User Interface Design](#user-interface-design)
9. [Development Roadmap](#development-roadmap)

---

## Executive Summary

### Problem Statement
Hartzell Companies currently uses standalone HTML forms for HR processes, resulting in:
- Manual data entry and duplication
- No centralized employee database
- Disconnected workflows
- No automation or pipeline management
- Difficult compliance tracking
- Poor user experience

### Solution
Build a comprehensive Next.js web application that:
- Integrates seamlessly with Bitrix24 SPA (entity type 1054)
- Provides unified employee lifecycle management
- Automates HR workflows from application to termination
- Delivers role-based dashboards for different user types
- Ensures compliance and audit-ready documentation

### Key Deliverables
1. Public employment application portal
2. Onboarding workflow system
3. Employee self-service portal
4. Manager dashboard for team oversight
5. HR admin interface for full system management
6. Performance review system
7. Disciplinary action tracking
8. Offboarding and termination workflow

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Application                   │
│                  (App Router, TypeScript)                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Public Pages │  │ Auth Pages   │  │ Protected    │  │
│  │ - Apply      │  │ - Login      │  │ - Dashboard  │  │
│  │ - Careers    │  │ - Register   │  │ - Employees  │  │
│  └──────────────┘  └──────────────┘  │ - Reviews    │  │
│                                        │ - Admin      │  │
│                                        └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                  API Layer (Route Handlers)              │
│  - /api/employees  - /api/onboarding  - /api/reviews    │
├─────────────────────────────────────────────────────────┤
│               Bitrix24 API Client (SDK)                  │
│  - Authentication  - CRUD Operations  - File Upload     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Bitrix24 Smart Process Automation           │
│                    (Entity Type 1054)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Pipeline 1: Recruitment (ID 18)                 │   │
│  │  - App Incomplete → Under Review → Offered       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Pipeline 2: Onboarding (ID 10)                  │   │
│  │  - Incomplete → Docs Pending → IT & Access       │   │
│  │  → Hired                                          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  - 100+ Custom Fields                                    │
│  - Document Storage                                      │
│  - Automation Rules                                      │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

```typescript
{
  "framework": "Next.js 14.2+",
  "language": "TypeScript 5.3+",
  "runtime": "Node.js 20+",
  "styling": {
    "primary": "Tailwind CSS 3.4+",
    "components": "shadcn/ui",
    "icons": "Lucide React"
  },
  "stateManagement": {
    "global": "Zustand",
    "server": "React Server Components",
    "forms": "React Hook Form"
  },
  "validation": "Zod",
  "api": {
    "client": "Bitrix24 REST API",
    "fetching": "native fetch with middleware"
  },
  "authentication": "NextAuth.js v5",
  "fileHandling": {
    "pdf": "react-pdf + jsPDF",
    "docx": "@docx/docx",
    "excel": "xlsx"
  },
  "dates": "date-fns",
  "charts": "Recharts",
  "notifications": "React Hot Toast",
  "deployment": "Vercel",
  "monitoring": "Vercel Analytics + Sentry"
}
```

---

## Data Model

### Bitrix24 Entity: HR Center (Type ID: 1054)

#### Core Employee Fields

```typescript
interface Employee {
  // System Fields
  id: number;
  entityTypeId: 1054;
  title: string; // "FirstName LastName - Position"
  categoryId: 10 | 18; // Pipeline: Onboarding | Recruitment
  stageId: string; // Current stage in pipeline
  createdTime: string;
  updatedTime: string;

  // Personal Information
  ufCrm6Name: string; // First Name *required
  ufCrm6SecondName?: string; // Middle Name
  ufCrm6LastName: string; // Last Name *required
  ufCrm6PersonalBirthday: string; // Date of Birth *required
  ufCrm6PersonalGender: 2002 | 2003; // Female | Male *required
  ufCrm6Ssn: string; // Social Security Number *required
  ufCrm6Email: string[]; // Email addresses *required, multiple
  ufCrm6PersonalMobile: string[]; // Personal phone *required, multiple
  ufCrm6WorkPhone?: string;
  ufCrm6PersonalPhone?: string;
  ufCrm6UfLegalAddress?: string;

  // Emergency Contact
  ufCrm6EmergencyContactName: string; // *required
  ufCrm6EmergencyContactPhone: string; // *required
  ufCrm6Relationship: string; // *required

  // Additional Personal
  ufCrm6MaritalStatus?: 2021 | 2022 | 2023 | 2024 | 2025;
  // Single | Married | Divorced | Widowed | Separated
  ufCrm6Citizenship: 2026 | 2027 | 2028 | 2029;
  // US Citizen | Permanent Resident | Work Visa | Other *required
  ufCrm6ProfilePhoto?: number; // File ID

  // Employment Details
  ufCrm6WorkPosition: string; // Position *required
  ufCrm6EmploymentType: 2030 | 2031 | 2032 | 2033 | 2034 | 2035;
  // Full-Time | Part-Time | Contract | Temporary | Intern | Seasonal *required
  ufCrm6EmploymentStartDate?: string;
  ufCrm6EmploymentStatus?: "Y" | "N"; // Active or Inactive
  ufCrm6PayRate?: string;
  ufCrm6BenefitsEligible?: "Y" | "N";
  ufCrm6PtoDays?: string;
  ufCrm6Subsidiary?: 2010 | 2012 | 2013 | 2014; // Company entity
  ufCrm6BadgeNumber: string; // Employee ID *required
  ufCrm6WcCode?: number; // Workers' Comp code

  // Termination
  ufCrm6TerminationDate?: string;
  ufCrm6RehireEligible?: "Y" | "N";

  // Documents
  ufCrm6HiringPaperwork: number[]; // File IDs *required
  ufCrm6BackgroundCheck?: number;
  ufCrm6DrugTest?: number[];
  ufCrm6Nda?: number;
  ufCrm6Noncompete?: number;
  ufCrm6HandbookAck: number; // *required
  ufCrm6WorkVisa?: number;
  ufCrm6VisaExpiry?: string;

  // Tax & Banking
  ufCrm6TaxFilingStatus: 2039 | 2040 | 2041 | 2042;
  // Single | Married Filing Jointly | Married Filing Separately | Head of Household *required
  ufCrm6DependentsInfo?: string[];
  ufCrm6DependentNames?: string[];
  ufCrm6DependentSsns?: string[];
  ufCrm6DependentRelationships?: string[];
  ufCrm6AdditionalFedWithhold?: string;
  ufCrm6AdditionalStateWithhold?: string;
  ufCrm6MultipleJobsWorksheet?: number;
  ufCrm6DeductionsWorksheet?: number;
  ufCrm_6_W4_EXEMPTIONS?: string;
  ufCrm_6_UF_W4_FILE?: number[];
  ufCrm_6_UF_I9_FILE?: number[];

  ufCrm6BankName?: string;
  ufCrm6BankAccountName?: string;
  ufCrm6BankAccountType?: 2036 | 2037 | 2038; // Checking | Savings | Money Market
  ufCrm6BankRouting?: string;
  ufCrm6BankAccountNumber?: string;
  ufCrm6DirectDeposit?: number;

  // Benefits
  ufCrm6HealthInsurance?: number;
  ufCrm_6_401K_ENROLLMENT?: number;
  ufCrm6LifeBeneficiaries?: string;

  // Equipment & IT
  ufCrm6EquipmentAssigned?: string[]; // JSON array of equipment
  ufCrm6SoftwareAccess?: string[];
  ufCrm6AccessPermissions?: string[];
  ufCrm6AccessLevel?: 2057 | 2058 | 2059 | 2060;
  // Basic User | Power User | Administrator | Super Admin
  ufCrm6SecurityClearance?: 2061 | 2062 | 2063 | 2064;
  // None | Confidential | Secret | Top Secret
  ufCrm6EquipmentStatus?: 2065 | 2066 | 2067 | 2068;
  // Issued | Returned | Lost | Damaged
  ufCrm6NetworkStatus?: 2069 | 2070 | 2071 | 2072;
  // Active | Inactive | Suspended | Disabled
  ufCrm6VpnAccess?: "Y" | "N";
  ufCrm6RemoteAccess?: "Y" | "N";

  // Training & Development
  ufCrm6RequiredTraining: 2073 | 2074 | 2075 | 2076;
  // Not Started | In Progress | Completed | Expired *required
  ufCrm6SafetyTraining: 2073 | 2074 | 2075 | 2076; // *required
  ufCrm6ComplianceTraining: 2073 | 2074 | 2075 | 2076; // *required
  ufCrm6TrainingComplete?: number[];
  ufCrm6Certifications?: number[];
  ufCrm6TrainingRecords?: number[];
  ufCrm6SkillsAssessment?: number;
  ufCrm6TrainingDocs?: number[];
  ufCrm6SkillsLevel?: string;
  ufCrm6TrainingDate?: string;
  ufCrm6NextTrainingDue?: string;
  ufCrm6TrainingNotes?: string;

  // Performance
  ufCrm6ReviewDate?: string[];

  // Metadata
  assignedById: number;
  lastActivityBy: number;
  lastActivityTime: string;
  observers?: number[];
  contactIds?: number[];
}
```

### Pipeline Stages

#### Recruitment Pipeline (Category ID: 18)

```typescript
enum RecruitmentStage {
  APP_INCOMPLETE = "DT1054_18:NEW",      // Application started but not submitted
  UNDER_REVIEW = "DT1054_18:PREPARATION", // Application under review
  OFFERED = "DT1054_18:SUCCESS",          // Offer extended
  REJECTED = "DT1054_18:FAIL"             // Application rejected
}
```

#### Onboarding Pipeline (Category ID: 10)

```typescript
enum OnboardingStage {
  INCOMPLETE = "DT1054_10:NEW",       // Onboarding not started
  DOCS_PENDING = "DT1054_10:PREPARATION", // Waiting for documents
  IT_ACCESS = "DT1054_10:CLIENT",     // IT setup and access provisioning
  HIRED = "DT1054_10:SUCCESS",        // Active employee
  NOT_HIRED = "DT1054_10:FAIL"        // Did not complete onboarding
}
```

---

## User Roles & Permissions

### Role Definitions

```typescript
enum UserRole {
  APPLICANT = "applicant",       // Public - can apply
  EMPLOYEE = "employee",         // Can view own data
  MANAGER = "manager",           // Can view/manage team
  HR_SPECIALIST = "hr_specialist", // Can manage all employees
  HR_ADMIN = "hr_admin",         // Full system access
  SUPER_ADMIN = "super_admin"    // System configuration
}

interface Permission {
  resource: string;
  actions: ("create" | "read" | "update" | "delete")[];
  conditions?: {
    own?: boolean;       // Can only access own records
    team?: boolean;      // Can access team records
    department?: boolean; // Can access department records
  };
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  applicant: [
    { resource: "application", actions: ["create", "read"], conditions: { own: true } },
    { resource: "application_status", actions: ["read"], conditions: { own: true } }
  ],
  employee: [
    { resource: "profile", actions: ["read", "update"], conditions: { own: true } },
    { resource: "documents", actions: ["read", "create"], conditions: { own: true } },
    { resource: "time_off", actions: ["create", "read"], conditions: { own: true } },
    { resource: "performance_review", actions: ["read"], conditions: { own: true } }
  ],
  manager: [
    // Inherits employee permissions
    { resource: "team_profiles", actions: ["read"], conditions: { team: true } },
    { resource: "performance_review", actions: ["create", "read", "update"], conditions: { team: true } },
    { resource: "disciplinary_action", actions: ["create", "read"], conditions: { team: true } },
    { resource: "time_off_approval", actions: ["read", "update"], conditions: { team: true } }
  ],
  hr_specialist: [
    { resource: "employees", actions: ["create", "read", "update"], conditions: { department: true } },
    { resource: "onboarding", actions: ["create", "read", "update", "delete"] },
    { resource: "performance_review", actions: ["create", "read", "update"] },
    { resource: "disciplinary_action", actions: ["create", "read", "update"] },
    { resource: "offboarding", actions: ["create", "read", "update"] },
    { resource: "reports", actions: ["read"] }
  ],
  hr_admin: [
    // Full access to all employee operations
    { resource: "*", actions: ["create", "read", "update", "delete"] }
  ],
  super_admin: [
    // Full system access including configuration
    { resource: "*", actions: ["create", "read", "update", "delete"] },
    { resource: "system_config", actions: ["create", "read", "update", "delete"] },
    { resource: "user_roles", actions: ["create", "read", "update", "delete"] }
  ]
};
```

---

## Module Specifications

### Module 1: Employment Application

**User Story:**
> As a job applicant, I want to submit my employment application online so that I can apply for positions at Hartzell Companies without filling out paper forms.

**Features:**
- Public-facing application form
- Form validation with real-time feedback
- Resume/document upload
- Auto-save draft functionality
- Application status tracking
- Email confirmation upon submission

**Workflow:**
1. Applicant visits `/apply` page
2. Fills out multi-step form:
   - Personal Information
   - Position Details
   - Employment History
   - Education
   - References
   - Certification & Authorization
3. Uploads resume and other documents
4. Submits application
5. System creates record in Bitrix24 (Recruitment pipeline, "App Incomplete" stage)
6. Applicant receives confirmation email
7. HR notified of new application

**API Endpoints:**
```typescript
POST /api/applications/create
  Request: ApplicationFormData
  Response: { applicationId: number, status: "submitted" }

GET /api/applications/:id/status
  Response: { stage: RecruitmentStage, updatedAt: string }

POST /api/applications/:id/upload-document
  Request: FormData (file)
  Response: { fileId: number, fileName: string }
```

**Bitrix24 Mapping:**
- Creates item in entity 1054, category 18 (Recruitment)
- Stage: DT1054_18:NEW (App Incomplete)
- Fills required fields: Name, Email, Phone, Position, etc.
- Uploads files to ufCrm6HiringPaperwork

---

### Module 2: Onboarding Workflow

**User Story:**
> As an HR specialist, I want to manage the new hire onboarding process digitally so that I can ensure all steps are completed and documented.

**Features:**
- New hire checklist (35+ items)
- Document collection portal
- Background check authorization
- Equipment assignment tracking
- Progress dashboard
- Automated email notifications
- Task assignments

**Workflow:**
1. HR moves applicant from Recruitment to Onboarding pipeline
2. System auto-generates onboarding checklist
3. New hire receives welcome email with portal link
4. New hire completes:
   - Personal information verification
   - Emergency contact info
   - Tax forms (W-4, state withholding)
   - Direct deposit setup
   - Handbook acknowledgment
   - Background check authorization
5. HR completes:
   - IT setup (email, computer, phone)
   - Benefits enrollment setup
   - Training schedule
   - Badge/access provisioning
6. Manager completes:
   - Welcome orientation
   - Role-specific training
7. System tracks completion percentage
8. When 100% complete, moves to "Hired" stage

**Checklist Categories:**
1. **Employee Information** (4 items)
   - Name, Position, Department, Hire Date
2. **Pre-Employment Requirements** (6 items)
   - Application, Background Check, Drug Test, References, Offer Letter, NDA
3. **Day 1 Requirements** (8 items)
   - I-9, W-4, State Tax, Driver's License, SSN Card, Direct Deposit, Emergency Contact, Handbook
4. **Payroll & Benefits** (5 items)
   - Paycom Setup, Health Insurance Date, Colonial Life Date, 401(k) Date, PTO Setup
5. **IT & Equipment** (10 items)
   - Email, Computer, Phone, Vehicle, Keys, Badge, System Access, Timecard, Gas Card, Credit Card
6. **Training & Orientation** (6 items)
   - Orientation, Safety Training, Job Training, Mentor, 30-Day Review, 90-Day Review

**API Endpoints:**
```typescript
GET /api/onboarding/:employeeId/checklist
  Response: ChecklistItem[]

PUT /api/onboarding/:employeeId/checklist/:itemId
  Request: { completed: boolean, completedBy: number, notes?: string }
  Response: { success: boolean }

POST /api/onboarding/:employeeId/move-stage
  Request: { targetStage: OnboardingStage }
  Response: { success: boolean, newStage: string }
```

**Bitrix24 Mapping:**
- Updates item in entity 1054, category 10 (Onboarding)
- Progresses through stages: NEW → PREPARATION → CLIENT → SUCCESS
- Updates multiple field groups based on checklist completion

---

### Module 3: Employee Management

**User Story:**
> As an employee, I want to view and update my personal information so that my records are always current.

**Features:**
- Employee directory
- Profile view/edit
- Document repository
- Emergency contact management
- Personal information updates
- Request workflows (address change, name change, etc.)

**Dashboard Sections:**
1. **Personal Info** - View/edit basic information
2. **Documents** - View uploaded documents, upload new
3. **Benefits** - View benefit enrollment, eligibility dates
4. **Equipment** - View assigned equipment
5. **Time Off** - View PTO balance, request time off
6. **Performance** - View performance review history

**API Endpoints:**
```typescript
GET /api/employees/:id
  Response: Employee

PUT /api/employees/:id/profile
  Request: Partial<Employee>
  Response: { success: boolean }

GET /api/employees/:id/documents
  Response: Document[]

POST /api/employees/:id/documents
  Request: FormData
  Response: { fileId: number }
```

---

### Module 4: Performance Management

**User Story:**
> As a manager, I want to conduct performance reviews digitally so that I can provide structured feedback and track employee development.

**Features:**
- Review cycle management
- 7-category rating system (1-5 stars)
- Goal setting and tracking
- Review history
- PDF export
- E-signature capture

**Review Categories:**
1. Job Knowledge & Skills
2. Quality of Work
3. Productivity & Efficiency
4. Communication Skills
5. Teamwork & Collaboration
6. Attendance & Punctuality
7. Safety Compliance

**Workflow:**
1. Manager initiates review for employee
2. Employee completes self-assessment (optional)
3. Manager rates each category, adds comments
4. System calculates overall rating
5. Manager writes summary, sets goals
6. Review meeting conducted
7. Both parties sign digitally
8. Review saved to employee record
9. Next review date scheduled

**API Endpoints:**
```typescript
POST /api/reviews/create
  Request: { employeeId: number, reviewType: string, reviewDate: string }
  Response: { reviewId: number }

PUT /api/reviews/:id/ratings
  Request: { category: string, rating: 1-5, comments?: string }
  Response: { success: boolean }

POST /api/reviews/:id/submit
  Request: { signature: string }
  Response: { success: boolean, pdfUrl: string }
```

---

### Module 5: Disciplinary Actions

**User Story:**
> As an HR specialist, I want to document disciplinary actions so that we have a clear record of employee conduct issues and corrective actions.

**Features:**
- 4-level progressive discipline system
- Incident documentation
- Corrective action plans
- Improvement deadlines
- E-signature capture
- Disciplinary history tracking

**Discipline Levels:**
1. Verbal Warning
2. First Written Warning
3. Second Written Warning / Probation
4. Final Warning / Termination

**Violation Types:**
- Tardiness
- Absenteeism
- Safety Violation
- Quality of Work
- Unprofessional Conduct
- Policy Violation
- Poor Performance
- Insubordination
- Other

**API Endpoints:**
```typescript
POST /api/disciplinary/create
  Request: DisciplinaryActionForm
  Response: { actionId: number }

GET /api/disciplinary/:employeeId/history
  Response: DisciplinaryAction[]
```

---

### Module 6: Offboarding & Termination

**User Story:**
> As an HR admin, I want to process employee terminations systematically so that all exit procedures are completed and company property is recovered.

**Features:**
- Termination letter generation
- Property return checklist
- Exit interview scheduling
- Final paycheck calculation
- Benefits termination
- System access revocation tracking
- Rehire eligibility designation

**Workflow:**
1. HR initiates termination for employee
2. Selects termination type and reason
3. Sets termination date
4. Reviews property return checklist
5. Generates termination letter
6. Prints/emails letter
7. Tracks exit interview
8. Verifies property returns
9. Processes final paycheck
10. Updates employee status to Inactive
11. Archives employee record

**API Endpoints:**
```typescript
POST /api/termination/initiate
  Request: TerminationForm
  Response: { terminationId: number }

POST /api/termination/:id/generate-letter
  Response: { letterPdf: string }

PUT /api/termination/:id/complete
  Request: { propertyReturned: boolean[], finalPaycheck: boolean }
  Response: { success: boolean }
```

---

## API Integration

### Bitrix24 REST API Client

```typescript
// lib/bitrix24/client.ts
class Bitrix24Client {
  private baseUrl = "https://hartzell.app/rest/1/jp689g5yfvre9pvd";

  async request<T>(method: string, params?: Record<string, any>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params || {})
    });

    const data = await response.json();

    if (data.error) {
      throw new Bitrix24Error(data.error, data.error_description);
    }

    return data.result as T;
  }

  // Employee CRUD
  async createEmployee(data: Partial<Employee>): Promise<number> {
    const result = await this.request("crm.item.add", {
      entityTypeId: 1054,
      fields: this.prepareFields(data)
    });
    return result.item.id;
  }

  async getEmployee(id: number): Promise<Employee> {
    const result = await this.request("crm.item.get", {
      entityTypeId: 1054,
      id
    });
    return this.mapFields(result.item);
  }

  async updateEmployee(id: number, data: Partial<Employee>): Promise<boolean> {
    await this.request("crm.item.update", {
      entityTypeId: 1054,
      id,
      fields: this.prepareFields(data)
    });
    return true;
  }

  async listEmployees(filters?: Record<string, any>): Promise<Employee[]> {
    const result = await this.request("crm.item.list", {
      entityTypeId: 1054,
      filter: filters
    });
    return result.items.map(this.mapFields);
  }

  // File operations
  async uploadFile(employeeId: number, file: File, fieldName: string): Promise<number> {
    const formData = new FormData();
    formData.append("entityTypeId", "1054");
    formData.append("id", employeeId.toString());
    formData.append(`fields[${fieldName}]`, file);

    const response = await fetch(`${this.baseUrl}/crm.item.update`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    return data.result.item[fieldName];
  }

  // Pipeline operations
  async moveStage(id: number, stageId: string): Promise<boolean> {
    await this.request("crm.item.update", {
      entityTypeId: 1054,
      id,
      fields: { stageId }
    });
    return true;
  }

  private prepareFields(data: Partial<Employee>): Record<string, any> {
    // Convert TypeScript Employee object to Bitrix24 field format
    // Handle array fields, enum values, etc.
  }

  private mapFields(item: any): Employee {
    // Convert Bitrix24 response to TypeScript Employee object
  }
}
```

### API Route Structure

```typescript
// app/api/employees/route.ts
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const filters = Object.fromEntries(searchParams);

  const client = new Bitrix24Client();
  const employees = await client.listEmployees(filters);

  return Response.json(employees);
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user, "employees", "create")) {
    return new Response("Forbidden", { status: 403 });
  }

  const data = await request.json();
  const validation = employeeSchema.safeParse(data);

  if (!validation.success) {
    return Response.json({ errors: validation.error.flatten() }, { status: 400 });
  }

  const client = new Bitrix24Client();
  const employeeId = await client.createEmployee(validation.data);

  await logAuditEvent({
    action: "employee.created",
    userId: session.user.id,
    entityId: employeeId,
    timestamp: new Date()
  });

  return Response.json({ employeeId }, { status: 201 });
}
```

---

## Security & Compliance

### Authentication

```typescript
// auth.config.ts
export const authConfig = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" }
      },
      async authorize(credentials) {
        const user = await getUserByEmail(credentials.email);
        if (!user || !await verifyPassword(credentials.password, user.hashedPassword)) {
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60 // 8 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as UserRole;
      return session;
    }
  }
};
```

### Data Encryption

```typescript
// Sensitive fields encrypted at rest in Bitrix24
const ENCRYPTED_FIELDS = [
  "ufCrm6Ssn",
  "ufCrm6BankAccountNumber",
  "ufCrm6BankRouting"
];

// All API requests use HTTPS
// Session cookies marked as secure, httpOnly, sameSite
```

### Audit Logging

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId: number;
  userName: string;
  action: string; // "created", "updated", "deleted", "viewed"
  entity: string; // "employee", "document", "review"
  entityId: number;
  changes?: Record<string, { old: any, new: any }>;
  ipAddress: string;
  userAgent: string;
}

// Every data modification logged
async function logAuditEvent(event: Omit<AuditLog, "id" | "timestamp">) {
  // Store in separate audit log table/service
}
```

---

## User Interface Design

### Design System

**Colors:**
```css
:root {
  --primary: #3b82f6; /* Blue */
  --success: #10b981; /* Green */
  --warning: #f59e0b; /* Amber */
  --danger: #ef4444;  /* Red */
  --slate: #64748b;   /* Neutral */
}
```

**Typography:**
- Font Family: Inter (system fallback: -apple-system, BlinkMacSystemFont, "Segoe UI")
- Headings: font-weight 700
- Body: font-weight 400
- Labels: font-weight 500

**Components:**
- Use shadcn/ui components
- Consistent spacing (4px grid)
- Rounded corners (8px default)
- Shadows for elevation
- Focus states for accessibility

### Page Layouts

#### Dashboard Layout
```
┌─────────────────────────────────────────────┐
│  Header (Logo, Nav, User Menu)             │
├───────────┬─────────────────────────────────┤
│           │                                 │
│  Sidebar  │  Main Content Area              │
│           │                                 │
│  - Home   │  [Page-specific content]        │
│  - Team   │                                 │
│  - Docs   │                                 │
│  - Admin  │                                 │
│           │                                 │
└───────────┴─────────────────────────────────┘
```

#### Form Layout
```
┌─────────────────────────────────────────────┐
│  Form Title                                 │
│  Progress Indicator (multi-step forms)      │
├─────────────────────────────────────────────┤
│                                             │
│  Section 1: Personal Information            │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ First Name  │  │ Last Name   │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
│  Section 2: Contact Information             │
│  ...                                        │
│                                             │
├─────────────────────────────────────────────┤
│  [Cancel]              [Save Draft] [Next]  │
└─────────────────────────────────────────────┘
```

---

## Development Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Week 1: Project Setup**
- Initialize Next.js project with TypeScript
- Configure Tailwind CSS + shadcn/ui
- Set up Bitrix24 API client
- Implement authentication (NextAuth.js)
- Create base layout and navigation

**Week 2: Core Infrastructure**
- Build employee data model and types
- Implement API route structure
- Create reusable form components
- Set up validation schemas (Zod)
- Implement error handling

**Week 3: Dashboard Foundation**
- Create role-based dashboard layouts
- Implement employee list view
- Build employee profile page
- Create document viewer

### Phase 2: Recruitment & Onboarding (Weeks 4-7)

**Week 4: Employment Application**
- Build public application form
- Implement multi-step form flow
- Add file upload functionality
- Create application submission workflow

**Week 5: Onboarding Checklist**
- Build checklist component
- Implement progress tracking
- Create onboarding dashboard
- Add automated email notifications

**Week 6: Document Management**
- Build document upload interface
- Implement document viewer
- Create document signing workflow
- Add document template system

**Week 7: Integration & Testing**
- End-to-end testing of application → onboarding flow
- Bug fixes and refinements
- Performance optimization

### Phase 3: Employee Management (Weeks 8-10)

**Week 8: Employee Portal**
- Build employee self-service dashboard
- Implement profile edit functionality
- Create document repository
- Add emergency contact management

**Week 9: Manager Tools**
- Build team dashboard for managers
- Implement team member directory
- Create approval workflows
- Add manager notifications

**Week 10: HR Admin Interface**
- Build comprehensive admin dashboard
- Implement bulk operations
- Create data export functionality
- Add advanced filtering and search

### Phase 4: Performance & Discipline (Weeks 11-13)

**Week 11: Performance Reviews**
- Build review creation interface
- Implement rating system
- Create review workflow
- Add PDF generation

**Week 12: Disciplinary Actions**
- Build disciplinary action form
- Implement progressive discipline tracking
- Create action history view
- Add letter generation

**Week 13: Reporting & Analytics**
- Build analytics dashboard
- Implement custom reports
- Create compliance reports
- Add data visualization

### Phase 5: Offboarding & Polish (Weeks 14-16)

**Week 14: Termination Process**
- Build termination workflow
- Implement property return checklist
- Create termination letter generator
- Add exit interview scheduling

**Week 15: Testing & QA**
- Comprehensive testing
- Security audit
- Performance testing
- Accessibility audit

**Week 16: Deployment & Launch**
- Production deployment
- User training
- Documentation
- Go-live support

---

## Success Criteria

### MVP Launch Criteria (End of Phase 2)
- ✅ Employment applications can be submitted digitally
- ✅ Onboarding checklist tracks all required items
- ✅ Documents can be uploaded and stored securely
- ✅ New hires can be moved through onboarding pipeline
- ✅ All data syncs with Bitrix24 in real-time
- ✅ Role-based access control implemented
- ✅ Audit logging functional
- ✅ Mobile responsive

### Full System Launch Criteria (End of Phase 5)
- ✅ All 7 modules fully functional
- ✅ 100% feature parity with HTML forms
- ✅ Performance reviews can be conducted digitally
- ✅ Termination process fully automated
- ✅ Comprehensive reporting available
- ✅ Security audit passed
- ✅ WCAG 2.1 AA compliance
- ✅ User training completed
- ✅ Documentation complete

---

*This specification is a living document and will be updated as the project evolves.*
