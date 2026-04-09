# Delaware Valley Drones - FAA Part 107 Course LMS

**Production URL:** https://delawarevalleydrones.com  
**Domain Host:** GoDaddy  
**Application Host:** DigitalOcean  
**Video Host:** Vimeo  
**Email Service:** Postmark  
**Payment Processing:** Stripe  

---

## Project Overview

A comprehensive **Learning Management System (LMS)** for delivering the FAA Part 107 Remote Pilot Certification course online. 

### Key Features

✅ **13 Course Chapters** with integrated multimedia (video + PDF)  
✅ **113+ Assessment Questions** with instant feedback  
✅ **60-Question Practice Exam** (final assessment)  
✅ **Student Dashboard** with progress tracking  
✅ **Auto-Generated Certificates** (PDF with unique ID)  
✅ **Instructor Admin Panel** (student management, gradebook, analytics)  
✅ **Forum Q&A** (per-chapter discussion threads)  
✅ **Stripe Payments** (one-time $99.99 purchase)  
✅ **Email Notifications** (enrollment, certificates, announcements)  
✅ **WCAG AA Accessibility** (responsive, keyboard navigation)  

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS | Responsive SPA (desktop, tablet, mobile) |
| **State Management** | Redux Toolkit or Zustand | Global state (auth, user, cart) |
| **Backend** | Node.js + Express + TypeScript | REST API server |
| **Database** | PostgreSQL 14+ | Relational data storage |
| **ORM** | TypeORM or Sequelize | Database abstraction |
| **Authentication** | JWT + bcrypt | Secure session management |
| **Video Hosting** | Vimeo | Professional video delivery |
| **File Storage** | AWS S3 or Cloudinary | PDFs, certificates, media |
| **Payment Processing** | Stripe API | Secure payments (PCI compliant) |
| **Email Service** | Postmark | Transactional emails |
| **Hosting** | DigitalOcean | App Platform + Managed PostgreSQL |
| **CDN** | CloudFlare | Static asset caching |
| **Monitoring** | Sentry + New Relic | Error tracking & performance |

---

## Project Structure

```
delaware-valley-drones-lms/
├── backend/              # Node.js/Express REST API
│   ├── src/
│   │   ├── config/       # Database, Stripe, Email configs
│   │   ├── middleware/   # Auth, RBAC, error handling
│   │   ├── models/       # TypeORM/Sequelize models
│   │   ├── routes/       # Express route handlers
│   │   ├── controllers/  # Business logic
│   │   ├── services/     # External API integrations
│   │   ├── migrations/   # Database schema changes
│   │   └── seeds/        # Test data
│   └── tests/            # Jest unit & integration tests
│
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── context/      # Auth, user, notification contexts
│   │   ├── services/     # API client methods
│   │   ├── types/        # TypeScript interfaces
│   │   └── styles/       # Tailwind CSS
│   └── tests/            # React Testing Library tests
│
├── database/             # Database schemas & seeds
│   ├── schema.sql        # Complete database schema
│   ├── seed_chapters.sql # Load 13 chapters
│   ├── seed_questions.sql # Load 113 questions + 60 exam
│   └── migrations/       # Migration files
│
├── docs/                 # Project documentation
│   ├── API.md            # API endpoint reference
│   ├── DATABASE.md       # Schema & data models
│   ├── ARCHITECTURE.md   # System design & diagrams
│   ├── SECURITY.md       # Security checklist
│   ├── DEPLOYMENT.md     # DigitalOcean setup
│   ├── TESTING.md        # Testing strategy
│   ├── INSTRUCTOR_GUIDE.md # Admin panel guide
│   └── DEVELOPMENT.md    # Developer onboarding
│
├── scripts/              # Automation scripts
│   ├── setup-local.sh    # Local dev setup
│   ├── setup-do.sh       # DigitalOcean provisioning
│   ├── db-migrate.sh     # Database migration
│   └── backup-db.sh      # Database backup
│
└── .github/workflows/    # CI/CD pipeline (GitHub Actions)
    ├── ci.yml           # Run tests on PR
    ├── deploy-staging.yml # Deploy to staging
    └── deploy-production.yml # Deploy to production
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ (with npm)
- **PostgreSQL** 14+ (local or via Docker)
- **Git** (for version control)
- **Docker** (optional, for containerization)

### Local Development Setup

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/delaware-valley-drones-lms.git
cd delaware-valley-drones-lms
```

2. **Run setup script:**
```bash
bash scripts/setup-local.sh
```

This will:
- Install npm dependencies (backend + frontend)
- Create `.env.local` files
- Start PostgreSQL (Docker)
- Run database migrations
- Seed test data

3. **Start development servers:**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

4. **Access the application:**
- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1
- API Docs: http://localhost:3000/api/docs (Swagger UI)

---

## Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=delaware_valley_drones
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Postmark
POSTMARK_API_TOKEN=your_postmark_token
POSTMARK_FROM_EMAIL=noreply@delawarevalleydrones.com

# AWS S3 (or Cloudinary)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=delaware-valley-drones
AWS_REGION=us-east-1

# Vimeo
VIMEO_ACCESS_TOKEN=xxxxx

# Sentry
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# CORS
CORS_ORIGIN=http://localhost:5173,https://delawarevalleydrones.com

# Email Verification
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_EXPIRY=24h

# Course Settings
COURSE_PRICE_CENTS=9999
COURSE_NAME="FAA Part 107 Remote Pilot Certification"
COURSE_DURATION_WEEKS=6
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
VITE_APP_NAME="Delaware Valley Drones"
VITE_APP_URL=http://localhost:5173
VITE_SUPPORT_EMAIL=support@delawarevalleydrones.com
```

---

## Database

### Create Local Database

```bash
# Using Docker (recommended)
docker run --name dvd-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14

# Or create manually in PostgreSQL
createdb delaware_valley_drones
```

### Run Migrations

```bash
cd backend
npm run migrate:up        # Apply all pending migrations
npm run migrate:down      # Revert last migration
npm run migrate:create    # Generate new migration template
```

### Seed Test Data

```bash
npm run seed:chapters      # Load 13 chapters
npm run seed:questions     # Load 113 questions + 60 exam
npm run seed:admin         # Create test admin user
```

---

## Development Commands

### Backend

```bash
# Start in development mode (auto-reload)
npm run dev

# Run tests
npm run test              # All tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Lint & format
npm run lint
npm run format

# Database
npm run migrate:up       # Run migrations
npm run seed:all         # Seed all test data

# Build for production
npm run build
npm run start            # Run production build
```

### Frontend

```bash
# Start in development mode (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Tests
npm run test             # Vitest
npm run test:coverage

# Lint & format
npm run lint
npm run format
```

---

## Testing

### Backend Testing

```bash
# Unit tests (Jest)
npm run test

# Specific test file
npm run test -- --testPathPattern="auth"

# Coverage report
npm run test:coverage
```

**Target Coverage:**
- Statements: ≥80%
- Branches: ≥75%
- Functions: ≥80%
- Lines: ≥80%

### Frontend Testing

```bash
# Component tests (React Testing Library + Vitest)
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## API Documentation

### OpenAPI/Swagger

API documentation is auto-generated from code comments:

```
http://localhost:3000/api/docs
```

### Manual API Reference

See `docs/API.md` for complete endpoint documentation.

### Stripe Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/v1/payments/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
```

---

## Deployment

### Staging Environment (DigitalOcean)

```bash
# Deploy to staging
git push origin develop
# GitHub Actions auto-deploys to staging

# Manual deploy if needed
bash scripts/setup-do.sh staging
```

### Production Environment

```bash
# Deploy to production (manual approval required)
git push origin main
# GitHub Actions runs tests, then waits for approval
# Approve deployment in GitHub Actions UI
```

See `docs/DEPLOYMENT.md` for detailed DigitalOcean setup.

---

## Security Checklist

- ✅ All passwords hashed with bcrypt (salt rounds ≥12)
- ✅ JWT tokens with 24h expiration
- ✅ HTTPS/SSL enabled (Let's Encrypt)
- ✅ CORS configured for allowed domains
- ✅ CSRF tokens on state-changing requests
- ✅ Rate limiting on all public endpoints
- ✅ Input validation on all forms
- ✅ SQL injection prevention (parameterized queries)
- ✅ Sensitive data encrypted at rest
- ✅ API keys stored in environment variables
- ✅ Stripe PCI DSS compliance
- ✅ GDPR data export & deletion support
- ✅ Sentry error tracking (no PII)

See `docs/SECURITY.md` for complete security guide.

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Page Load Time | ≤3 seconds (3G) |
| API Response Time (p95) | ≤200ms |
| Concurrent Users | ≥1,000 |
| Uptime | 99.5% |
| Error Rate | <1% |

---

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Verify .env has correct credentials
grep DB_ backend/.env
```

**Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Module Not Found**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Stripe Keys Invalid**
```bash
# Get test keys from https://dashboard.stripe.com
# Update STRIPE_SECRET_KEY and STRIPE_PUBLIC_KEY in .env
```

---

## Contributing

1. **Create a branch:**
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes and test:**
```bash
npm run lint
npm run test
npm run build
```

3. **Commit with conventional commits:**
```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update README"
```

4. **Push and create PR:**
```bash
git push origin feature/your-feature-name
```

5. **PR will auto-run tests** (pass required before merge)

---

## Support & Contact

- **Email:** support@delawarevalleydrones.com
- **Instructor:** James Grasell (james@delawarevalleydrones.com)
- **Issues:** GitHub Issues
- **Documentation:** See `docs/` folder

---

## License

MIT License - See LICENSE file

---

## Roadmap

### Phase 1 ✅ (April 2026)
- ✅ Project scaffolding & architecture
- ✅ Database schema design
- ✅ API endpoint documentation

### Phase 2 (May 2026) - IN PROGRESS
- ✅ Express server setup with TypeORM
- ✅ 14 database entities with relationships
- ✅ JWT authentication system
- ✅ Base authentication routes (register, login, refresh, profile)
- ✅ Middleware layer (auth, error handling)
- ⏳ Student dashboard & progress API
- ⏳ Chapter management API
- ⏳ Quiz engine & auto-grading
- ⏳ Stripe payment integration
- ⏳ Email service integration (Postmark)

### Phase 3 (June 2026)
- Frontend development (React, Dashboard, Quizzes)
- Responsive design (mobile, tablet, desktop)

### Phase 4 (July 2026)
- Instructor admin panel
- Student gradebook
- Analytics dashboard

### Phase 5 (August 2026)
- Certificates generation
- Forum Q&A
- Video completion tracking

### Phase 6 (September 2026)
- Testing & QA
- Security audit
- Performance optimization

### Phase 7 (October 2026)
- Deployment to DigitalOcean
- DNS configuration (GoDaddy)
- Launch & monitoring

---

## Version History

**v1.0** (April 2026)
- Initial project setup
- Complete database schema
- Full API specification
- Development environment

---

**Last Updated:** April 9, 2026  
**Status:** PHASE 2 IN PROGRESS 🚀 (Foundation Complete - API Implementation Next)  
**Phase 2.1 Completion:** 40% - Backend foundation (Express, TypeORM, Auth) ✅
