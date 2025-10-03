# Hartzell HR Center - Frontend

Employee-facing web interface for the Hartzell HR Center built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

### Authentication
- 🔐 Employee ID + Date of Birth login
- 🔒 Last 4 SSN verification for sensitive actions
- 🛡️ Cloudflare Turnstile CAPTCHA (after 3 failed attempts)
- ⏱️ Automatic session management
- 📱 Mobile-responsive design

### Dashboard
- 📊 Action-oriented layout prioritizing urgent items
- 🚨 Urgent task alerts
- 📈 Summary statistics (signatures, tasks, documents, profile completion)
- ⚡ Real-time status updates

### Documents
- 📄 View all HR documents by category
- ✍️ Sign documents via OpenSign integration
- ⬇️ Download documents
- 🏷️ Organized by: Personal, Benefits, Payroll, Policies

### Signatures
- ✍️ Pending signature requests
- 📝 Completed signature history
- 🔗 Direct OpenSign integration
- ⏰ Expiration tracking

### Profile
- 👤 Personal information
- 💼 Employment details
- 📍 Address information
- ✉️ Contact HR for updates

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Form Validation**: Zod
- **Icons**: Lucide React
- **CAPTCHA**: Cloudflare Turnstile

## Prerequisites

- Node.js 20+
- npm or yarn
- Access to Cloudflare Workers backend (hartzell.work)
- Cloudflare Turnstile site key

## Getting Started

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Update `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://hartzell.work/api
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
NEXT_PUBLIC_OPENSIGN_ENV=sandbox
```

### 3. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── documents/      # Documents page
│   │   │   ├── signatures/     # Signatures page
│   │   │   └── profile/        # Profile page
│   │   ├── login/              # Login page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home (redirects to /login)
│   │   ├── providers.tsx       # React Query provider
│   │   └── globals.css         # Global styles
│   ├── components/             # Reusable components
│   │   └── TurnstileWidget.tsx # CAPTCHA component
│   ├── lib/                    # Utilities
│   │   ├── api.ts              # API client
│   │   └── utils.ts            # Helper functions
│   ├── types/                  # TypeScript types
│   │   └── index.ts            # Type definitions
│   └── middleware.ts           # Auth middleware
├── public/                     # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## Deployment Options

### Option 1: Cloudflare Pages (Recommended)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build and deploy
npm run build
wrangler pages deploy .next
```

Configure in Cloudflare Pages dashboard:
- Build command: `npm run build`
- Build output directory: `.next`
- Environment variables: Add `NEXT_PUBLIC_*` vars

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Option 3: Docker

```dockerfile
# Create Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t hartzell-hr-frontend .
docker run -p 3000:3000 hartzell-hr-frontend
```

## Environment Variables

### Required

- `NEXT_PUBLIC_API_URL` - Backend API URL (https://hartzell.work/api)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key

### Optional

- `NEXT_PUBLIC_OPENSIGN_ENV` - OpenSign environment (sandbox/production)

## API Integration

The frontend connects to the Cloudflare Workers backend via the API client (`src/lib/api.ts`).

### Endpoints Used

- `POST /api/auth/login` - Login with Employee ID + DOB
- `POST /api/auth/verify-ssn` - Verify SSN
- `GET /api/auth/session` - Check session validity
- `POST /api/auth/logout` - Logout
- `GET /api/employee/profile` - Get employee profile
- `GET /api/employee/dashboard` - Get dashboard summary
- `GET /api/employee/tasks` - Get pending tasks
- `GET /api/employee/documents` - Get documents
- `GET /api/signatures/pending` - Get pending signatures
- `GET /api/signatures/:id/url` - Get OpenSign URL

## Authentication Flow

1. User enters Employee ID + Date of Birth
2. After 3 failed attempts, CAPTCHA is required
3. If employee data contains sensitive info, SSN verification is triggered
4. Upon successful auth, session cookie is set (HTTPOnly, Secure)
5. Session expires after 8 hours or 30 minutes of inactivity

## Styling

### Tailwind Utilities

Custom utilities defined in `globals.css`:

```css
.btn-primary    /* Primary button */
.btn-secondary  /* Secondary button */
.input-field    /* Form input */
.card           /* Card container */
.badge          /* Status badge */
```

### Theme Colors

```css
--hartzell-blue: #0066CC
--hartzell-navy: #003366
```

## Type Safety

All API responses and data structures are typed using TypeScript interfaces defined in `src/types/index.ts`.

## State Management

TanStack Query handles:
- Server state caching
- Automatic refetching
- Loading and error states
- Optimistic updates

Example:

```typescript
const { data: profile, isLoading } = useQuery({
  queryKey: ['profile'],
  queryFn: () => api.getProfile(),
});
```

## Security Features

- ✅ HTTPOnly session cookies
- ✅ CSRF protection via SameSite cookies
- ✅ Rate limiting (backend)
- ✅ CAPTCHA after failed attempts
- ✅ SSN verification for sensitive actions
- ✅ Automatic session timeout
- ✅ Secure HTTPS-only communication

## Performance Optimizations

- React Query caching (1-minute stale time)
- Next.js automatic code splitting
- Image optimization (if using next/image)
- Tailwind CSS purging for minimal bundle size

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### CAPTCHA not showing

**Solution**: Ensure `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set and Turnstile script is loading.

### API requests failing

**Solution**: Check CORS configuration in Cloudflare Workers backend and verify API URL.

### Session expires immediately

**Solution**: Ensure cookies are enabled and backend `SESSION_SECRET` is set correctly.

### TypeScript errors

**Solution**: Run `npm run type-check` to identify issues.

## Contributing

1. Follow TypeScript strict mode
2. Use Tailwind utilities over custom CSS
3. Keep components small and focused
4. Add proper TypeScript types for all data

## Support

For issues or questions:
- Email: hr@hartzell.work
- Internal: Contact IT/HR department

---

**Built for Hartzell Companies** 🔧
