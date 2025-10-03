# Hartzell HR Center - Project Constitution

**Project:** Hartzell Companies HR Center
**Technology:** Next.js 14+ (App Router), TypeScript, Tailwind CSS
**Created:** October 3, 2025

---

## Core Principles

### 1. **User-Centric Design**
- Every feature must solve a real pain point for HR staff, managers, or employees
- Interfaces should be intuitive enough to require minimal training
- Mobile-responsive design is mandatory, not optional

### 2. **Data Integrity & Security**
- Employee data is sacred - implement defense-in-depth security
- All sensitive data (SSN, bank info, medical) must be encrypted at rest and in transit
- Role-based access control (RBAC) enforced at every level
- Complete audit trail for all data modifications

### 3. **Integration-First Approach**
- Bitrix24 is the single source of truth for all employee data
- All CRUD operations must go through Bitrix24 API
- No shadow databases or data duplication
- Real-time sync with Bitrix24 SPA

### 4. **Workflow Automation**
- Automate repetitive HR tasks wherever possible
- Clear pipeline progression with automated notifications
- Reduce manual data entry through intelligent form pre-population
- Automated document generation (offer letters, termination letters, etc.)

### 5. **Compliance & Audit-Ready**
- Every action must be logged with timestamp and user
- Document retention policies built-in
- GDPR, HIPAA, and SOC 2 considerations from day one
- Exportable audit trails for compliance reporting

### 6. **Progressive Enhancement**
- Build core features first (application, onboarding, employee management)
- Advanced features (performance reviews, analytics) come later
- Each module must work independently
- No feature creep - stick to the roadmap

### 7. **Performance & Scalability**
- Page load times under 2 seconds
- Support for 500+ employees without degradation
- Optimistic UI updates with background sync
- Efficient API calls with proper caching

### 8. **Maintainability**
- TypeScript for type safety
- Comprehensive error handling
- Clear code comments for complex business logic
- Modular architecture for easy updates

### 9. **Accessibility**
- WCAG 2.1 AA compliance minimum
- Keyboard navigation for all features
- Screen reader friendly
- High contrast mode support

### 10. **Transparency**
- Users should always know what's happening (loading states, success/error messages)
- No silent failures
- Clear error messages with actionable guidance
- Real-time progress indicators for long operations

---

## Success Metrics

### Phase 1 (MVP - 3 months)
- ✅ 100% of new hires processed through digital onboarding
- ✅ Zero manual data entry for employee records
- ✅ 80% reduction in onboarding paperwork time
- ✅ Complete audit trail for all employee actions

### Phase 2 (Full System - 6 months)
- ✅ 100% of performance reviews conducted digitally
- ✅ Real-time compliance dashboard for HR admin
- ✅ 95% employee self-service adoption
- ✅ Average task completion time reduced by 60%

---

## Non-Negotiables

1. **Security:** No shortcuts on security - ever
2. **Bitrix24 Integration:** Everything must integrate with Bitrix24
3. **Mobile Support:** Must work on phones and tablets
4. **Type Safety:** TypeScript everywhere, no `any` types
5. **Testing:** No feature ships without tests
6. **Documentation:** Every API endpoint must be documented
7. **User Consent:** Explicit consent for all data collection
8. **Data Portability:** Users must be able to export their data

---

## Out of Scope (For Now)

- Payroll processing (use existing systems)
- Time tracking (separate module)
- Benefits administration (handled by Colonial Life)
- Background check processing (HireRight integration only)
- Applicant tracking from job boards (manual entry for MVP)

---

## Technology Constraints

- **Frontend:** Next.js 14+ with App Router (no Pages Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** React Context + Zustand (no Redux)
- **Forms:** React Hook Form + Zod validation
- **API:** Bitrix24 REST API (no GraphQL)
- **Hosting:** Vercel (or similar edge platform)
- **Database:** Bitrix24 (no separate DB)

---

## Development Workflow

1. **Specification First:** Write detailed specs before coding
2. **Type Definitions:** Define TypeScript interfaces first
3. **API Contract:** Define API endpoints before implementation
4. **Component Design:** Design UI components before implementation
5. **Test-Driven:** Write tests alongside features
6. **Code Review:** All code must be reviewed
7. **Documentation:** Update docs with every feature

---

## Communication Standards

- **Daily standups** during active development
- **Weekly demos** to stakeholders
- **Bi-weekly retrospectives** for continuous improvement
- **Slack for quick questions**, email for decisions
- **GitHub Issues** for bug tracking
- **Notion/Confluence** for long-form documentation

---

*This constitution serves as the guiding principles for the Hartzell HR Center project. All decisions should be evaluated against these principles.*
