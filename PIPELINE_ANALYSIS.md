# Bitrix24 Pipeline Analysis - Complete Breakdown

**Retrieved:** October 3, 2025
**Source:** Bitrix24 API (Entity Type 1054)

---

## Pipeline Overview

Hartzell HR Center uses **2 distinct pipelines** to manage the employee lifecycle:

1. **Recruitment Pipeline** (Category ID: 18) - For applicants
2. **Onboarding Pipeline** (Category ID: 10) - For new hires

---

## Pipeline 1: RECRUITMENT (Category ID: 18)

**Purpose:** Manage job applications from submission through hiring decision

**Current Records:** 0 (no active applicants)

### Stages:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECRUITMENT PIPELINE                          │
└─────────────────────────────────────────────────────────────────┘

1️⃣  APP INCOMPLETE (DT1054_18:NEW)
    Status ID: 234
    Color: #22b9ff (Light Blue)
    Semantics: None
    Sort: 10
    ──────────────────────────────────────────
    → Applicant started but hasn't submitted application
    → Auto-save draft functionality needed
    → Can resume application later

    ↓

2️⃣  UNDER REVIEW (DT1054_18:PREPARATION)
    Status ID: 235
    Color: #88b9ff (Medium Blue)
    Semantics: None
    Sort: 20
    ──────────────────────────────────────────
    → Application submitted and under HR review
    → Screening, interviews, reference checks
    → Decision pending

    ↓                          ↓

3️⃣  OFFERED (DT1054_18:SUCCESS)         4️⃣  REJECTED (DT1054_18:FAIL)
    Status ID: 237                          Status ID: 238
    Color: #00ff00 (Green)                 Color: #ff0000 (Red)
    Semantics: S (Success)                 Semantics: F (Fail)
    Sort: 40                               Sort: 50
    ────────────────────────────           ───────────────────────
    → Offer extended                       → Application declined
    → Move to Onboarding pipeline          → Archive candidate
      when accepted                        → Keep for future roles
```

### Stage Progression Rules:

**From App Incomplete:**
- ✅ Can move to: Under Review (when application submitted)
- ✅ Can move to: Rejected (if withdrawn)
- ❌ Cannot skip to: Offered

**From Under Review:**
- ✅ Can move to: Offered (hiring decision made)
- ✅ Can move to: Rejected (not selected)
- ✅ Can move back to: App Incomplete (if more info needed)

**From Offered:**
- ✅ Transfer to: Onboarding Pipeline (when accepted)
- ✅ Can move to: Rejected (offer declined)
- 🔒 Terminal state if accepted (SUCCESS semantic)

**From Rejected:**
- 🔒 Terminal state (FAIL semantic)
- ⚠️ Can reopen for future consideration

---

## Pipeline 2: ONBOARDING (Category ID: 10)

**Purpose:** Manage new hire onboarding from offer acceptance through active employment

**Current Records:** 39 active employees (all currently in "Incomplete" stage)

### Stages:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING PIPELINE                           │
└─────────────────────────────────────────────────────────────────┘

1️⃣  INCOMPLETE (DT1054_10:NEW)
    Status ID: 190
    Color: #22b9ff (Light Blue)
    Semantics: None
    Sort: 10
    ──────────────────────────────────────────
    → New hire moved from Recruitment
    → Initial information collection
    → Onboarding checklist 0-25% complete

    ↓

2️⃣  DOCS PENDING (DT1054_10:PREPARATION)
    Status ID: 191
    Color: #88b9ff (Medium Blue)
    Semantics: None
    Sort: 20
    ──────────────────────────────────────────
    → Waiting for required documents
    → W-4, I-9, background check, etc.
    → Onboarding checklist 26-60% complete

    ↓

3️⃣  IT & ACCESS (DT1054_10:CLIENT)
    Status ID: 192
    Color: #10e5fc (Cyan)
    Semantics: None
    Sort: 30
    ──────────────────────────────────────────
    → Documents received
    → IT provisioning in progress
    → Email, computer, phone, access badges
    → Onboarding checklist 61-99% complete

    ↓                          ↓

4️⃣  HIRED (DT1054_10:SUCCESS)           5️⃣  NOT HIRED (DT1054_10:FAIL)
    Status ID: 193                          Status ID: 194
    Color: #00ff00 (Green)                 Color: #ff0000 (Red)
    Semantics: S (Success)                 Semantics: F (Fail)
    Sort: 40                               Sort: 50
    ────────────────────────────           ───────────────────────
    → Active employee                      → Did not complete
    → All checklist items complete         → Declined offer
    → Full system access                   → Failed background
    → Regular employee status              → Archive record
```

### Stage Progression Rules:

**From Incomplete:**
- ✅ Can move to: Docs Pending (when employee starts document submission)
- ✅ Can move to: Not Hired (if they don't show up or decline)
- ❌ Cannot skip to: IT & Access or Hired

**From Docs Pending:**
- ✅ Can move to: IT & Access (when all docs received)
- ✅ Can move to: Not Hired (failed background check, declined offer)
- ✅ Can move back to: Incomplete (if major issues found)

**From IT & Access:**
- ✅ Can move to: Hired (when IT provisioning complete)
- ✅ Can move to: Not Hired (in rare cases)
- ⚠️ Should not move backwards unless critical issue

**From Hired:**
- 🔒 Terminal state for onboarding (SUCCESS semantic)
- ➡️ Employee becomes "Active" - managed separately
- ⚠️ Termination handled through separate workflow (not a stage move)

**From Not Hired:**
- 🔒 Terminal state (FAIL semantic)
- 📁 Record archived but retained for compliance

---

## Key Insights

### Current State (October 2025):

**Recruitment Pipeline:**
- ✅ Configured and ready
- 📭 **0 active applications**
- 🎯 **Action:** Enable public application form to start pipeline

**Onboarding Pipeline:**
- ✅ Configured and in use
- 👥 **39 employees** currently onboarding
- ⚠️ **ALL 39 in "Incomplete" stage** - needs attention!
- 🎯 **Action:** Review and progress employees through stages

### Stage Distribution (Onboarding):

```
Stage            Count   %      Status
─────────────────────────────────────────────
Incomplete       39     100%   ⚠️ NEEDS REVIEW
Docs Pending     0      0%
IT & Access      0      0%
Hired            0      0%
Not Hired        0      0%
─────────────────────────────────────────────
TOTAL            39     100%
```

**🚨 ALERT:** All 39 employees stuck in first stage suggests:
- Manual data entry without stage progression
- Pipeline not being actively used yet
- Opportunity for immediate improvement with new system

---

## Automation Opportunities

### Recruitment Pipeline:

1. **App Incomplete → Under Review**
   - Trigger: Application form submitted
   - Auto-action: Email to HR team
   - Notification: Applicant confirmation email

2. **Under Review → Offered**
   - Trigger: HR marks as "Offer Extended"
   - Auto-action: Generate offer letter
   - Notification: Email to applicant

3. **Offered → Onboarding**
   - Trigger: Offer accepted
   - Auto-action: Create in Onboarding pipeline
   - Auto-action: Send welcome email with next steps
   - Auto-action: Assign onboarding checklist

4. **Under Review → Rejected**
   - Trigger: HR marks as rejected
   - Auto-action: Send rejection email
   - Auto-action: Archive record

### Onboarding Pipeline:

1. **Incomplete → Docs Pending**
   - Trigger: Employee completes initial info
   - Auto-action: Send document request email
   - Auto-action: Create document upload tasks

2. **Docs Pending → IT & Access**
   - Trigger: All required docs uploaded
   - Auto-action: Notify IT department
   - Auto-action: Create IT provisioning tasks
   - Auto-action: Assign access badges to HR

3. **IT & Access → Hired**
   - Trigger: All IT tasks completed
   - Auto-action: Set employee status to "Active"
   - Auto-action: Send welcome email
   - Auto-action: Notify manager
   - Auto-action: Schedule 30/60/90 day reviews

4. **Any → Not Hired**
   - Trigger: Manual action by HR
   - Auto-action: Revoke any provisioned access
   - Auto-action: Archive record
   - Auto-action: Update reporting

---

## Integration with HR Center Modules

### Module Mapping:

| Module | Pipeline | Stages Used |
|--------|----------|-------------|
| **Employment Application** | Recruitment | App Incomplete, Under Review |
| **Onboarding Checklist** | Onboarding | All stages |
| **Document Management** | Both | Docs Pending (primary) |
| **IT Provisioning** | Onboarding | IT & Access |
| **Employee Portal** | Onboarding | Hired (triggers activation) |
| **Performance Reviews** | N/A | Post-hire workflow |
| **Termination** | N/A | Separate workflow |

---

## Recommended Stage Actions

### When Employee Enters Each Stage:

**RECRUITMENT:**

```typescript
// App Incomplete
- Create draft application record
- Send auto-save confirmation
- Set 30-day expiration for incomplete apps

// Under Review
- Assign to HR reviewer
- Create review checklist
- Schedule interview if needed
- Request reference checks

// Offered
- Generate offer letter (OpenSign)
- Set offer expiration date (typically 7 days)
- Track offer acceptance status
- Prepare onboarding materials

// Rejected
- Send professional rejection email
- Add to talent pool for future roles
- Archive application
- Update ATS statistics
```

**ONBOARDING:**

```typescript
// Incomplete
- Send welcome email
- Assign onboarding checklist
- Request basic information
- Set start date
- Assign HR coordinator

// Docs Pending
- Request W-4, I-9, direct deposit
- Send background check authorization (OpenSign)
- Request emergency contact info
- Upload employee handbook (OpenSign for acknowledgment)
- Track document completion %

// IT & Access
- Create email account
- Order computer, phone
- Provision system access
- Create security badge
- Assign parking if applicable
- Add to company directory

// Hired
- Set employment status to "Active"
- Enable self-service portal
- Assign to manager in system
- Schedule orientation
- Set 30-day review reminder
- Welcome announcement (optional)

// Not Hired
- Revoke any access granted
- Archive all documents
- Update candidate status
- Retain for compliance period
```

---

## Visual Pipeline Flow

```
                    COMPLETE EMPLOYEE LIFECYCLE

┌─────────────────┐
│   APPLICANT     │
│   (External)    │
└────────┬────────┘
         │
         │ Applies Online
         ↓
┌─────────────────────────────────────────────────────────┐
│                  RECRUITMENT PIPELINE                    │
│                                                          │
│  Incomplete → Under Review → Offered → [Accepted]       │
│                           ↓                              │
│                       Rejected                           │
└──────────────────────────┬──────────────────────────────┘
                           │
                           │ Offer Accepted
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  ONBOARDING PIPELINE                     │
│                                                          │
│  Incomplete → Docs Pending → IT & Access → Hired        │
│                                          ↓               │
│                                      Not Hired           │
└──────────────────────────┬──────────────────────────────┘
                           │
                           │ Hired = Active
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  ACTIVE EMPLOYEE                         │
│         (Not a pipeline - separate workflows)            │
│                                                          │
│  - Performance Reviews (annual cycle)                   │
│  - Disciplinary Actions (if needed)                     │
│  - Promotions / Transfers                               │
│  - Training & Development                               │
│  - Time Off / Benefits                                  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           │ Employment Ends
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  OFFBOARDING WORKFLOW                    │
│         (Not a pipeline - one-time process)              │
│                                                          │
│  - Termination letter (OpenSign)                        │
│  - Property return checklist                            │
│  - Exit interview                                       │
│  - Final paycheck                                       │
│  - Access revocation                                    │
│  - Set status to Inactive                               │
└─────────────────────────────────────────────────────────┘
```

---

## API Usage for Pipelines

### Moving Between Stages:

```typescript
// Move employee to next stage
await bitrix24Client.request("crm.item.update", {
  entityTypeId: 1054,
  id: employeeId,
  fields: {
    stageId: "DT1054_10:PREPARATION" // Docs Pending
  }
});
```

### Moving Between Pipelines:

```typescript
// Move from Recruitment to Onboarding
await bitrix24Client.request("crm.item.update", {
  entityTypeId: 1054,
  id: applicantId,
  fields: {
    categoryId: 10,  // Onboarding pipeline
    stageId: "DT1054_10:NEW"  // Incomplete stage
  }
});
```

### Checking Stage Distribution:

```typescript
// Get count by stage
const stages = await bitrix24Client.request("crm.item.list", {
  entityTypeId: 1054,
  filter: {
    categoryId: 10,
    stageId: "DT1054_10:NEW"
  }
});

console.log(`Employees in Incomplete: ${stages.total}`);
```

---

## Compliance Considerations

### Stage Duration Tracking:

Each stage should track:
- Entry timestamp
- Exit timestamp
- Duration in stage
- Who moved to this stage
- Reason for stage change

**Recommended Custom Fields:**
- `ufCrm6StageEntryDate` (Date)
- `ufCrm6StageChangedBy` (User)
- `ufCrm6StageChangeReason` (Text)

### Audit Requirements:

- Log every stage transition
- Track who made the change
- Record timestamp
- Capture reason/notes
- Maintain complete history

---

## Next Steps

### Immediate Actions:

1. **Audit Current 39 Employees**
   - Review each record
   - Determine correct stage
   - Update stageId accordingly
   - Document any issues

2. **Enable Recruitment Pipeline**
   - Launch public application form
   - Test complete flow
   - Monitor new applications

3. **Automate Stage Transitions**
   - Implement automation rules
   - Configure email notifications
   - Set up webhooks for status changes

4. **Add Progress Tracking**
   - Checklist completion %
   - Days in each stage
   - Blockers/issues log

---

*This analysis provides the foundation for building automated workflows in the HR Center application.*
