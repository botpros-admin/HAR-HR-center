# Hartzell HR Center - Next.js Application

> Comprehensive HR management system built with Next.js 14, TypeScript, and Bitrix24 integration

---

## 📋 Project Overview

The Hartzell HR Center is a modern web application that replaces standalone HTML forms with an integrated, spec-driven Next.js system for managing the complete employee lifecycle from application to termination.

### Key Features

- 🎯 **Complete Employee Lifecycle Management** - Recruitment → Onboarding → Active → Offboarding
- 🔐 **Role-Based Access Control** - 6 distinct user roles with granular permissions
- 📱 **Mobile-First Design** - Fully responsive, works on all devices
- 🔄 **Real-Time Bitrix24 Sync** - All data stored in Bitrix24 SPA (entity type 1054)
- 📊 **Dual Pipeline System** - Separate recruitment and onboarding workflows
- 📄 **Digital Document Management** - Upload, store, and e-sign documents
- ⚡ **Workflow Automation** - Automated notifications and task assignments
- 📈 **Analytics & Reporting** - Comprehensive HR dashboards and reports

---

## 🏗️ System Architecture

### Technology Stack

```
Frontend:  Next.js 14+ (App Router), TypeScript 5.3+, Tailwind CSS
Components: shadcn/ui, Lucide React
State:     React Server Components, Zustand
Forms:     React Hook Form + Zod validation
Auth:      NextAuth.js v5
Backend:   Bitrix24 REST API (entity type 1054)
Hosting:   Vercel / Edge Platform
```

### Project Structure

```
/app
  /api                 # API route handlers
    /employees
    /onboarding
    /reviews
  /auth               # Authentication pages
  /dashboard          # Protected dashboards
  /recruitment        # Public application
  /admin              # System administration

/components
  /ui                 # shadcn/ui components
  /forms              # Reusable form components
  /layouts            # Page layouts

/lib
  /bitrix24           # Bitrix24 API client
    client.ts
    employees.ts
    documents.ts
    types.ts
  /utils              # Utility functions
  /validation         # Zod schemas

/public               # Static assets
```

---

## 📊 Data Model

### Bitrix24 Integration

**Entity Type:** 1054 (HR Center)

**Pipelines:**
1. **Recruitment (ID: 18)** - Application → Review → Offer
2. **Onboarding (ID: 10)** - Incomplete → Docs → IT Setup → Hired

**Field Groups:**
- Personal Information (20+ fields)
- Employment Details (15+ fields)
- Tax & Banking (20+ fields)
- Benefits (10+ fields)
- Equipment & IT (15+ fields)
- Training & Development (10+ fields)
- Performance (5+ fields)
- Documents (15+ file fields)

**Total Custom Fields:** 100+

---

## 👥 User Roles & Access

| Role | Access Level | Key Capabilities |
|------|--------------|------------------|
| **Applicant** | Public | Submit applications, track status |
| **Employee** | Self-service | View/edit own profile, upload documents |
| **Manager** | Team | View team, conduct reviews, approve time off |
| **HR Specialist** | Department | Manage employees, onboarding, reports |
| **HR Admin** | Full | Complete employee management |
| **Super Admin** | System | Configuration, user management |

---

## 🎯 Core Modules

### 1. Recruitment & Application
- Public employment application form
- Multi-step form with validation
- Resume/document upload
- Application status tracking
- HR review dashboard

### 2. Onboarding
- 35-item onboarding checklist
- Progress tracking dashboard
- Document collection portal
- Background check authorization
- Equipment assignment tracking
- Automated email notifications

### 3. Employee Management
- Employee directory
- Profile management
- Document repository
- Emergency contact updates
- Benefits tracking
- PTO balance display

### 4. Performance Management
- Performance review cycles
- 7-category rating system
- Goal setting and tracking
- Review history
- PDF export
- Digital signatures

### 5. Disciplinary Actions
- 4-level progressive discipline
- Incident documentation
- Corrective action plans
- Disciplinary history
- Letter generation

### 6. Offboarding
- Termination letter generation
- Property return checklist
- Exit interview scheduling
- Final paycheck tracking
- System access revocation
- Benefits termination

### 7. Admin & Reporting
- User role management
- Analytics dashboards
- Custom reports
- Compliance reporting
- Audit logs

---

## 🚀 Development Roadmap

### Phase 1: Foundation (Weeks 1-3)
- [x] Project setup and configuration
- [x] Bitrix24 API integration
- [x] Authentication system
- [x] Base layouts and navigation
- [ ] Core components library

### Phase 2: Recruitment & Onboarding (Weeks 4-7)
- [ ] Employment application form
- [ ] Onboarding checklist system
- [ ] Document management
- [ ] Email notifications
- [ ] Pipeline workflows

### Phase 3: Employee Management (Weeks 8-10)
- [ ] Employee portal
- [ ] Manager dashboard
- [ ] HR admin interface
- [ ] Approval workflows

### Phase 4: Performance & Discipline (Weeks 11-13)
- [ ] Performance review system
- [ ] Disciplinary action tracking
- [ ] Reporting & analytics

### Phase 5: Offboarding & Polish (Weeks 14-16)
- [ ] Termination process
- [ ] Testing & QA
- [ ] Deployment & launch

**Total Timeline:** 16 weeks (4 months)

---

## 📁 Project Files

### Planning Documents

```
📂 HR Center/
├── CONSTITUTION.md          # Project principles and guidelines
├── SPECIFICATION.md         # Complete technical specification
├── README.md               # This file
├── DATA_SUMMARY.txt        # Bitrix24 data summary
├── bitrix_fields_complete.json     # Complete field schema
├── bitrix_stages.json              # Onboarding pipeline stages
└── bitrix_recruitment_stages.json  # Recruitment pipeline stages

📂 hire_center_extracted/   # Original HTML forms
├── employment_application.html
├── new_hire_checklist.html
├── performance_review.html
├── disciplinary_action.html
├── background_authorization.html
├── property_receipt.html
└── termination_process.html
```

---

## 🔐 Security & Compliance

### Security Measures
- ✅ HTTPS only (TLS 1.3)
- ✅ Role-based access control (RBAC)
- ✅ Session management with JWT
- ✅ Data encryption at rest and in transit
- ✅ Secure password hashing (bcrypt)
- ✅ CSRF protection
- ✅ XSS prevention
- ✅ SQL injection prevention (N/A - API only)
- ✅ Rate limiting on API endpoints
- ✅ Security headers (CSP, HSTS, etc.)

### Compliance
- ✅ GDPR - Right to access, delete, export data
- ✅ HIPAA - PHI handling for health insurance
- ✅ SOC 2 - Security controls and audit trails
- ✅ Complete audit logging
- ✅ Data retention policies

---

## 📊 Current Data Status

**From Bitrix24 SPA:**

- **Total Employees in Onboarding:** 39
- **Total in Recruitment:** 0
- **Pipelines:** 2 (Recruitment + Onboarding)
- **Total Stages:** 9
- **Custom Fields:** 100+
- **Field Types:** String, Number, Date, Enum, File, Boolean

**Sample Employees:**
1. Diego M Duran - Project Manager (EMP1001)
2. Ryan S Hanslip - Supervisor (EMP1002)
3. Drew Hanslip - Project Manager (EMP1003)
4. Charles Lawder Swift - Outside Sales (EMP1004)
5. Carly N Taylor - Office Clerk (EMP1005)
... and 34 more

---

## 🛠️ Getting Started (Future)

### Prerequisites

```bash
Node.js 20+
npm or yarn or pnpm
Git
```

### Installation

```bash
# Clone repository
git clone https://github.com/hartzell/hr-center.git
cd hr-center

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Bitrix24 credentials

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

### Environment Variables

```env
# Bitrix24 Configuration
BITRIX24_WEBHOOK_URL=https://hartzell.app/rest/1/jp689g5yfvre9pvd
BITRIX24_ENTITY_TYPE_ID=1054

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Optional: Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@hartzell.com
SMTP_PASS=your-password
```

---

## 🧪 Testing Strategy

### Unit Tests
- All utility functions
- Form validation schemas
- API client methods

### Integration Tests
- API route handlers
- Bitrix24 integration
- Authentication flows

### E2E Tests
- Complete user workflows
- Application submission
- Onboarding process
- Performance reviews

### Testing Tools
- Jest (unit tests)
- React Testing Library
- Playwright (E2E)
- MSW (API mocking)

---

## 📈 Performance Targets

- **Page Load:** < 2 seconds
- **Time to Interactive:** < 3 seconds
- **Lighthouse Score:** > 90
- **Core Web Vitals:**
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch from `main`
2. Follow TypeScript strict mode
3. Write tests for new features
4. Update documentation
5. Submit pull request
6. Code review required
7. Merge to `main`

### Code Standards

- ESLint + Prettier configuration
- TypeScript strict mode
- Functional components (React)
- Server components where possible
- No `any` types
- Comprehensive JSDoc comments

---

## 📞 Support & Contact

**Project Lead:** [Your Name]
**Email:** hr-tech@hartzell.com
**Slack:** #hr-center-dev

---

## 📝 License

Proprietary - Hartzell Companies
© 2025 Hartzell Companies. All rights reserved.

---

## 🎉 Acknowledgments

- **GitHub Spec Kit** - Spec-driven development methodology
- **Bitrix24** - Backend platform and API
- **Vercel** - Hosting and deployment
- **shadcn/ui** - Component library
- **Tailwind Labs** - Styling framework

---

**Status:** ✅ Planning Complete | 🚧 Implementation Starting Soon

*Last Updated: October 3, 2025*
