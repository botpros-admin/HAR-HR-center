# Complete Employee Lifecycle Pipeline Architecture
**Date:** October 20, 2025
**Purpose:** Design comprehensive 4-pipeline system for complete employee lifecycle management

---

## 🎯 Vision: Streamlined Employee Journey

```
          [APPLICANTS]
               ↓ reject
               → (archive/delete after 12mo)
               ↓ offer accepted
          [ONBOARDING]
               ↓ complete
          [EMPLOYEES] ← Active Management
               ↓ termination/resignation
          [TERMINATED]
               ↓ alumni (optional archive)
```

---

## Pipeline 1: APPLICANTS (Category 18) ✅ EXISTS

**Purpose:** Job application tracking from submission to hiring decision

### Stages:
1. **App Incomplete** (`DT1054_18:NEW`)
   - Auto-saved drafts
   - Trigger: Email verification reminder after 24hrs

2. **Under Review** (`DT1054_18:PREPARATION`)
   - Complete applications being evaluated
   - HR can add notes, schedule interviews

3. **Interview Scheduled** (`DT1054_18:UC_INTERVIEW`) *NEW - TO CREATE*
   - Candidate progressing to interview
   - Auto-email interview confirmation
   - Calendar integration

4. **Offer** (`DT1054_18:SUCCESS`)
   - Job offer extended
   - **Automations:**
     - Congratulations email
     - Assign offer letter (multi-signer)
     - Create HR follow-up task
   - **Exit:** When offer letter fully signed → move to Onboarding

5. **Reject** (`DT1054_18:FAIL`)
   - Application declined
   - **Automations:**
     - Professional rejection email
     - Set retention expiry (12 months)
     - Timeline entry
   - **Exit:** Archive/delete after retention period

### Key Metrics:
- Application → Offer conversion rate
- Time to hire (days)
- Rejection reasons analysis
- Source of hire tracking

---

## Pipeline 2: ONBOARDING (Category 10) ✅ EXISTS (needs stages)

**Purpose:** New hire document completion and first-week preparation

### Stages:

1. **Incomplete** (`DT1054_10:INCOMPLETE`) *NEW - TO CREATE*
   - Just transitioned from Applicants → Offer (signed)
   - **Auto-assign documents:**
     - Offer Letter (already signed)
     - I-9 Employment Eligibility
     - W-4 Tax Withholding
     - Direct Deposit Authorization
     - Background Check Consent
     - Drug Test Consent
   - **Automations:**
     - Welcome to onboarding email
     - Daily progress check (if < 3 days to start)
   - **Trigger to next stage:** 3+ documents signed

2. **In Progress** (`DT1054_10:IN_PROGRESS`) *NEW - TO CREATE*
   - Actively completing pre-start paperwork
   - **Auto-assign Day 1 documents:**
     - Employee Handbook Acknowledgment
     - NDA Agreement
     - Non-Compete Agreement
     - Safety Training Acknowledgment
   - **Automations:**
     - Reminder emails (daily if < 7 days to start)
     - Escalation to HR if incomplete 3 days before start
   - **Trigger to next stage:** All required docs submitted

3. **Pending Review** (`DT1054_10:PENDING_REVIEW`) *NEW - TO CREATE*
   - All documents submitted, HR reviewing
   - **Manual checks:**
     - I-9 verification with physical documents
     - Background check cleared
     - Drug test results received
   - **Automations:**
     - Notify HR when candidate reaches this stage
     - Notify IT/Facilities to prep workspace
   - **Trigger to next stage:** Manual HR approval

4. **Ready for Day 1** (`DT1054_10:READY`) *NEW - TO CREATE*
   - Paperwork complete, all checks passed
   - **Automations:**
     - "You're all set!" email to new hire
     - Day 1 logistics email (where to go, what to bring)
     - Notify manager: new hire starts tomorrow
     - Create Day 1 checklist task
   - **Exit:** On actual start date → move to Employees pipeline

### Key Metrics:
- Document completion rate
- Days to complete onboarding
- Incomplete onboarding alerts (< 3 days to start)
- Documents requiring re-submission

---

## Pipeline 3: EMPLOYEES (Category XX) *NEW - TO CREATE*

**Purpose:** Active employee management, ongoing compliance, career development

### Stages:

1. **Active - Probation** (`DT1054_XX:PROBATION`) *NEW - TO CREATE*
   - First 90 days of employment
   - **Document assignments:**
     - 30-day check-in form
     - 60-day performance review
     - 90-day probation evaluation
   - **Automations:**
     - Schedule 30/60/90 day review reminders
     - Notify manager at each milestone
   - **Trigger to next stage:** 90 days elapsed + manager approval

2. **Active - Regular** (`DT1054_XX:ACTIVE`) *NEW - TO CREATE*
   - Standard active employment status
   - **Ongoing automations:**
     - Annual performance review assignment (scheduled)
     - Certification renewal reminders (driver's license, insurance)
     - Required training assignments
     - Benefits open enrollment (annual)
   - **Use cases:**
     - Disciplinary actions tracking
     - Promotion tracking
     - Internal transfers
     - Compensation changes
     - Address/contact updates
   - **Stays here until:** Termination event

3. **Active - PIP** (`DT1054_XX:PIP`) *NEW - TO CREATE*
   - Performance Improvement Plan (disciplinary action)
   - **Document assignments:**
     - PIP agreement form
     - Weekly check-in reports
     - Final PIP evaluation (30/60/90 days)
   - **Automations:**
     - Weekly manager reminder
     - HR escalation if not improving
   - **Exits:**
     - Success → back to Active - Regular
     - Failure → move to Terminated (involuntary)

4. **Active - Leave** (`DT1054_XX:LEAVE`) *NEW - TO CREATE*
   - On leave (medical, parental, military, sabbatical)
   - **Document assignments:**
     - FMLA paperwork
     - Leave request form
     - Return-to-work clearance
   - **Automations:**
     - Leave duration tracking
     - Return date reminders
     - Benefits continuation notices
   - **Trigger to next stage:** Return from leave → back to Active - Regular

5. **Notice Period** (`DT1054_XX:NOTICE`) *NEW - TO CREATE*
   - Employee gave resignation notice or company gave termination notice
   - **Document assignments:**
     - Resignation letter
     - Exit interview form
     - Knowledge transfer checklist
   - **Automations:**
     - Last day countdown
     - Property return reminder (laptop, keys, phone)
     - Manager handoff task
   - **Trigger to next stage:** Last day worked → move to Terminated

### Key Metrics:
- Total active employees
- Employees in probation (by hire date)
- Employees on PIP (high-risk)
- Employees on leave (duration)
- Average tenure

---

## Pipeline 4: TERMINATED (Category XX) *NEW - TO CREATE*

**Purpose:** Offboarding, final paperwork, alumni relations

### Stages:

1. **Offboarding** (`DT1054_XX:OFFBOARDING`) *NEW - TO CREATE*
   - Final days, completing exit process
   - **Document assignments:**
     - Exit interview form
     - Final paycheck acknowledgment
     - Property return checklist
     - Non-compete reminder (if applicable)
     - COBRA benefits enrollment form
   - **Automations:**
     - Collect company property (laptop, keys, badge, phone)
     - Disable system access on last day
     - Final paycheck processing
     - COBRA notification (by law)
   - **Trigger to next stage:** All exit docs complete

2. **Former - Voluntary** (`DT1054_XX:VOLUNTARY`) *NEW - TO CREATE*
   - Employee resigned (good standing)
   - **Automations:**
     - Alumni network invitation
     - LinkedIn endorsement request
     - Boomerang rehire tracking
   - **Use cases:**
     - Reference requests
     - Rehire consideration
     - Alumni events

3. **Former - Involuntary** (`DT1054_XX:INVOLUNTARY`) *NEW - TO CREATE*
   - Terminated by company (fired, laid off)
   - **Automations:**
     - Unemployment claim tracking
     - Reference request policy (limited info)
   - **Use cases:**
     - Legal documentation
     - Rehire eligibility: NO

4. **Former - Retirement** (`DT1054_XX:RETIREMENT`) *NEW - TO CREATE*
   - Retired employees
   - **Automations:**
     - Retirement benefits enrollment
     - Pension/401k rollover info
   - **Use cases:**
     - Retiree benefits management
     - Alumni relations

5. **Deceased** (`DT1054_XX:DECEASED`) *NEW - TO CREATE*
   - Employee passed away
   - **Automations:**
     - Life insurance beneficiary notification
     - Final paycheck to estate
   - Sensitive handling, HR only

### Key Metrics:
- Turnover rate (voluntary vs involuntary)
- Exit interview sentiment
- Rehire rate (boomerang employees)
- Average tenure at termination
- Reasons for leaving

---

## 🔄 Complete Lifecycle Flow

### Happy Path:
```
1. APPLICANTS → Under Review
2. APPLICANTS → Interview Scheduled
3. APPLICANTS → Offer
4. [Offer letter signed] ✍️
5. ONBOARDING → Incomplete
6. ONBOARDING → In Progress
7. ONBOARDING → Pending Review
8. ONBOARDING → Ready for Day 1
9. [Start Date] 🎉
10. EMPLOYEES → Active - Probation
11. [90 days] ✅
12. EMPLOYEES → Active - Regular
    ... (years of employment)
13. [Resignation notice] 📝
14. EMPLOYEES → Notice Period
15. [Last day] 👋
16. TERMINATED → Offboarding
17. TERMINATED → Former - Voluntary
    ... (alumni forever)
```

### Alternative Paths:

**Rejection:**
```
APPLICANTS → Under Review → Reject
[Archive after 12 months]
```

**Performance Issue:**
```
EMPLOYEES → Active - Regular → Active - PIP
  → (if successful) → Active - Regular
  → (if unsuccessful) → Notice Period → TERMINATED → Former - Involuntary
```

**Leave of Absence:**
```
EMPLOYEES → Active - Regular → Active - Leave
  → (returns) → Active - Regular
```

**Retirement:**
```
EMPLOYEES → Active - Regular → Notice Period
  → TERMINATED → Offboarding → Former - Retirement
```

---

## 📋 Document Assignment Matrix

| Pipeline | Stage | Documents Assigned | Due Date |
|----------|-------|-------------------|----------|
| **Applicants** | Offer | Offer Letter (multi-signer) | 3 days |
| **Onboarding** | Incomplete | I-9, W-4, Direct Deposit, BG Check, Drug Test | Before start |
| **Onboarding** | In Progress | Handbook, NDA, Non-Compete, Safety Training | Day 1 |
| **Employees** | Probation | 30/60/90 Day Reviews | 30/60/90 days |
| **Employees** | Active | Annual Review, Cert Renewals, Training | Annual/As needed |
| **Employees** | PIP | PIP Agreement, Weekly Reports, Final Eval | 30-90 days |
| **Employees** | Leave | FMLA, Leave Request, Return Clearance | Before leave |
| **Employees** | Notice | Resignation Letter, Exit Interview, Knowledge Transfer | Last day |
| **Terminated** | Offboarding | Exit Interview, Property Return, COBRA | Last day |

---

## 🎯 Automation Triggers Summary

### Stage Change Triggers:
1. **Applicants → Offer**: Manual (HR decision)
2. **Offer → Onboarding (Incomplete)**: Auto when offer letter fully signed
3. **Incomplete → In Progress**: Auto when 3+ docs signed
4. **In Progress → Pending Review**: Auto when all required docs signed
5. **Pending Review → Ready**: Manual (HR approval)
6. **Ready → Employees (Probation)**: Auto on start date (cron job)
7. **Probation → Active**: Auto after 90 days + manager approval
8. **Active → Notice**: Manual (resignation/termination notice)
9. **Notice → Terminated (Offboarding)**: Auto on last day worked
10. **Offboarding → Former (type)**: Auto when exit docs complete

### Email Triggers:
- Applicants → Reject: Rejection email
- Applicants → Offer: Congratulations email
- Onboarding → Incomplete: Welcome email
- Onboarding → Ready: "You're all set!" email
- Employees → Probation: 30/60/90 day reminders
- Employees → PIP: Weekly check-in reminders
- Employees → Notice: Exit process checklist
- Terminated → Offboarding: Final paycheck, COBRA notices

---

## 🔧 Implementation Phases

### Phase 1: Core Applicant Automations (Week 1) ✅
- ✅ Rejection email
- ✅ Offer email
- ✅ Offer letter multi-signer workflow

### Phase 2: Create Pipeline Structure (Week 2)
- Create Employees pipeline (Category XX)
- Create Terminated pipeline (Category XX)
- Create all stages for Onboarding, Employees, Terminated
- Migrate 39 existing employees to Employees → Active - Regular

### Phase 3: Onboarding Automation (Week 3)
- Document assignment system
- Stage transition logic
- Progress tracking
- Reminder emails

### Phase 4: Employee Pipeline Automation (Week 4)
- Probation milestone reminders
- Annual review scheduling
- Certification renewal tracking
- Leave of absence tracking

### Phase 5: Termination Pipeline Automation (Week 5)
- Exit interview automation
- Property return checklist
- Final paycheck processing
- Alumni network integration

---

## 📊 Reporting & Analytics Dashboard

### Pipeline Health Metrics:
- **Applicants:** Conversion rates, time-to-hire, rejection reasons
- **Onboarding:** Completion rate, days to complete, bottlenecks
- **Employees:** Headcount, tenure distribution, PIP success rate
- **Terminated:** Turnover rate, exit reasons, rehire eligibility

### Alerts & Notifications:
- 🚨 Onboarding incomplete < 3 days to start
- ⚠️ Certification expiring in 30 days
- 📅 Annual review due this month
- 🔄 Probation ending in 7 days
- 👋 Employee last day tomorrow

---

## ✅ Next Steps

**DECISION REQUIRED:**
1. Approve 4-pipeline structure (Applicants/Onboarding/Employees/Terminated)
2. Confirm stage names for each pipeline
3. Decide what to do with 39 existing employees in Onboarding → NEW
   - **Recommendation:** Move to new Employees pipeline → Active - Regular

**ONCE APPROVED:**
1. Create Employees and Terminated pipelines in Bitrix24
2. Create all stages for each pipeline
3. Migrate existing data
4. Implement automations in phases

---

**Status:** 🎨 Architecture complete, awaiting approval to build
