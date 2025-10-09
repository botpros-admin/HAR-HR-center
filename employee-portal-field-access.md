# Employee Portal Field Access Guide

## Purpose & Scope

This document captures which Bitrix24 HR Center fields appear in the Hartzell employee self-service portal, the level of access employees have (view or edit), and why each decision was made. It consolidates information from the technical specification, frontend implementation, and Cloudflare Worker routes.

Primary sources:
- Employee dashboard mock and requirements (`CLOUDFLARE_ARCHITECTURE.md`).
- Implemented employee profile UI (`frontend/src/app/dashboard/profile/page.tsx`).
- Employee API routes (`cloudflare-app/workers/routes/employee.ts`).
- Security mandates in the project constitution (`CONSTITUTION.md`).

## Employee-Facing Fields

| ID | Bitrix Field | Portal Exposure | Employee Access | Notes |
|----|--------------|-----------------|-----------------|-------|
| 1578 | First Name (`ufCrm6Name`) | Profile card | View | Rendered via `FieldDisplay` without edit controls. |
| 1580 | Last Name (`ufCrm6LastName`) | Profile card | View | Same component pattern as first name. |
| 1581 | Date of Birth (`ufCrm6PersonalBirthday`) | Profile card | View | Display-only with formatted date. |
| 1585 | Personal Email (`ufCrm6Email`) | Profile card | Edit | `EditableField` allows updates; worker maps updates to Bitrix array field. |
| 1587 | Personal Cellphone (`ufCrm6PersonalMobile`) | Profile card | Edit | Editable input that persists via `/employee/profile` PUT. |
| 1591 | Position (`ufCrm6WorkPosition`) | Employment section | View | Display-only; flagged as HR-managed. |
| 1595 | Start Date (`ufCrm6EmploymentStartDate`) | Dashboard welcome card | View | Shown on the home dashboard summary. |
| 1596 | Address (`ufCrm6Address` / `ufCrm6UfLegalAddress`) | Profile card | Edit | Street line editable; worker sanitises value before persisting. |
| 1602 | W-4 Form (`ufCrm_6_UF_W4_FILE`) | Documents + tasks | Sign/View | Listed under "My Documents" and driven by document assignment flow. |
| 1603 | I-9 Form (`ufCrm_6_UF_I9_FILE`) | Documents + tasks | Sign/View | Same handling as W-4. |
| 1604 | Subsidiary (`ufCrm6Subsidiary`) | Employment section | View | Read-only department display. |
| 1607 | Emergency Contact Name (`ufCrm6EmergencyContactName`) | Planned | Planned edit | Included in spec; frontend component pending. |
| 1608 | Emergency Contact Phone (`ufCrm6EmergencyContactPhone`) | Planned | Planned edit | Same as above. |
| 1609 | Emergency Contact Relationship (`ufCrm6Relationship`) | Planned | Planned edit | Same as above. |
| 1611 | PTO Days Allocated (`ufCrm6PtoDays`) | Benefits card | View | Displayed in dashboard benefits summary. |
| 1639 | Employee Handbook Acknowledgment (`ufCrm6HandbookAck`) | Documents & tasks | Sign/View | Appears in document shortcuts and action items. |
| 1641 | Direct Deposit Authorization (`ufCrm6DirectDeposit`) | Documents | View | Shortcut button routes to stored document. |
| 1642 | Health Insurance Enrollment (`ufCrm6HealthInsurance`) | Benefits card | View | Shows enrolled/not enrolled status. |
| 1643 | 401k Enrollment (`ufCrm_6_401K_ENROLLMENT`) | Benefits card | View | Shows enrolled/not enrolled status. |
| 1656 | Equipment Assigned (`ufCrm6EquipmentAssigned`) | Dashboard equipment card | View | JSON-parsed list rendered read-only. |
| 1662 | Employee ID (`ufCrm6BadgeNumber`) | Profile card | View | Part of quick profile summary. |

## HR-Only Fields (Hidden from Employees)

These fields stay within HR/Admin tooling because they contain sensitive information, require administrative workflows, or are out of scope for employee self-service.

### Sensitive Personal & Payroll Data
- 1586 Social Security Number (`ufCrm6Ssn`)
- 1610–1623, 1644, 1645 Tax, salary, and withholding data
- 1654 Bank Account Type, 1655 Tax Filing Status

Security principle: protect SSN, banking, and salary information (`CONSTITUTION.md`). Additional SSN verification occurs during login (`cloudflare-app/workers/routes/auth.ts`).

### Administrative Contact Details
- 1579 Middle Name, 1582 Sex, 1588–1590 work phone numbers, 1650 Marital Status, 1651 Citizenship Status

These attributes are not surfaced in the current profile payload and remain HR-managed.

### Compliance & Workflow Controls
- 1592 Employment Status, 1594 Payment Method, 1605 Project Category, 1606 Sales Territory
- 1626–1629, 1657, 1659–1668, 1670–1673, 1676 IT/security, training status, and compliance metadata

The employee profile API intentionally omits these (`cloudflare-app/workers/routes/employee.ts`), and the UI warns that employment information is HR-controlled (`frontend/src/app/dashboard/profile/page.tsx`).

### Document Archives
- 1597–1600, 1633–1638, 1640, 1646–1649, 1669

Employees interact with these via document assignments and signing tasks (`DOCUMENT_SYSTEM_COMPLETE.md`), not as always-visible fields.

## Pending Enhancements

1. **Emergency Contact Editor** — Implement UI and Bitrix mapping for IDs 1607–1609, as called out in the specification.
2. **Address Breakdown** — Extend editable fields to include city, state, and ZIP once backend support exists.
3. **Document Coverage** — Decide which additional compliance files should surface in the document library, beyond the current shortcuts.
4. **Status Visibility** — Evaluate exposing read-only employment status or training progress for transparency; data already returned by the worker.

## Change Log

- 2025-??-?? — Initial draft capturing the state of the portal field access controls.

## Employee Portal Structure Outline

- **Dashboard Summary**
  - Welcome header with avatar (future enhancement), quick stats (PTO balance, pending tasks), recent signed attachments pulled from the document system.
- **Personal Information**
  - Legal names (first, middle, last, preferred), date of birth, citizenship and marital status (if policy allows), profile photo upload.
- **Contact Details**
  - Personal email and phone (editable), emergency contact triad (name/phone/relationship), physical address (street, city, state, ZIP).
- **Employment Snapshot**
  - Employee ID, position/title, department/subsidiary, employment type/status, hire/start dates, manager assignment.
- **Compensation & Benefits**
  - PTO allocation, health/401(k)/life enrollment indicators, pay frequency or salary range (when approved), links to pay stubs if integrated.
- **Training & Compliance**
  - Required/safety/compliance training status, next training due date, certifications, performance review schedule.
- **Equipment & Access**
  - Assigned equipment list, software/system access levels, VPN/remote approval indicators, equipment return reminders.
- **Attachments**
  - Central “Signed Attachments” hub for viewing signed files and completing outstanding document assignments.
- **Support & Actions**
  - HR contact info, change request forms (address/name/IT help), quick links to policies or FAQs.

## Admin Employee Area Outline

1. **Identity & Employment**
   - Full personal details, employment lifecycle status, pipeline stage, manager relationships, badge and work location metadata.
2. **Compensation & Payroll**
   - Pay rate/salary data, compensation history, PTO accrual, employment status flags, workflow approvals.
3. **Tax & Banking**
   - W-4 and state withholding data, exemptions, dependent information, direct-deposit banking records, payment method.
4. **Compliance & Documents**
   - Background checks, drug tests, NDAs, visa/authorization tracking, auto insurance and driver’s license expiries, training documents, generated letters.
5. **IT & Security**
   - System access level, software permissions, safety clearances, equipment lifecycle, network/VPN status, access revocation checklist.
6. **Training & Performance**
   - Assigned trainings, certifications, skills matrix, performance review history, disciplinary actions, development plans.
7. **Lifecycle Management**
   - Onboarding/offboarding checklists, rehire eligibility, termination data, stage automation controls, audit logs.
8. **Reporting & Exports**
   - Custom reports, bulk updates, scheduled exports, analytics dashboards, audit trail viewer.

