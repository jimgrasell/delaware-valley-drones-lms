# Development Setup & Architecture Guide

**Target Audience:** Developers building the Delaware Valley Drones LMS  
**Last Updated:** April 2026  
**Status:** PHASE 1 - Ready for Implementation

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Architecture Overview](#architecture-overview)
3. [Technology Decisions](#technology-decisions)
4. [Development Workflow](#development-workflow)
5. [Git & Version Control](#git--version-control)
6. [Code Style & Standards](#code-style--standards)
7. [Testing Strategy](#testing-strategy)
8. [Debugging & Logging](#debugging--logging)

---

## Local Development Setup

### System Requirements

- **OS:** macOS, Linux, or Windows (WSL2)
- **Node.js:** v18.0.0 or higher (use nvm)
- **PostgreSQL:** 14+ (use Docker)
- **Git:** 2.30+
- **RAM:** 8GB minimum
- **Disk Space:** 10GB minimum

### Step 1: Install Node.js

```bash
# Using nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18.16.0
nvm use 18.16.0
nvm alias default 18.16.0

# Verify installation
node --version    # v18.16.0
npm --version     # 9.x
```

### Step 2: Setup PostgreSQL

```bash
# Using Docker (recommended)
docker run \
  --name dvd-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=delaware_valley_drones \
  -p 5432:5432 \
  -d postgres:14

# Verify PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres -d delaware_valley_drones -c "SELECT 1"
```

### Step 3: Clone Repository

```bash
git clone https://github.com/your-org/delaware-valley-drones-lms.git
cd delaware-valley-drones-lms
```

### Step 4: Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Edit .env.local with your configuration
# At minimum, set:
# - DB_HOST=localhost
# - DB_PORT=5432
# - DB_NAME=delaware_valley_drones
# - DB_USER=postgres
# - DB_PASSWORD=postgres

# Run migrations
npm run migrate:up

# Seed database with test data
npm run seed:all

# Start development server
npm run dev
# Runs on http://localhost:3000
```

### Step 5: Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Ensure VITE_API_URL points to backend
# VITE_API_URL=http://localhost:3000/api/v1

# Start development server
npm run dev
# Runs on http://localhost:5173
```

### Step 6: Verify Setup

```bash
# Test backend API
curl http://localhost:3000/api/v1/health

# Expected response:
# {"status": "ok", "timestamp": "2026-04-09T10:15:00Z"}

# Test frontend is serving
curl http://localhost:5173

# Open browser
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000/api/v1
```

---

## Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                      │
│         React SPA (TypeScript + Tailwind CSS)           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Redux Store (Global State)              │   │
│  │  - auth (JWT tokens, user role)                 │   │
│  │  - user (profile, progress)                     │   │
│  │  - ui (notifications, loading states)           │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│             HTTP/REST (JSON Payloads)                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              LOAD BALANCER (CloudFlare)                 │
│         (CDN, DDoS protection, SSL/TLS)                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│            BACKEND API (Node.js + Express)              │
│         TypeScript + REST Architecture                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Routes (Express Router)              │   │
│  │  GET /api/v1/students/dashboard                 │   │
│  │  POST /api/v1/quizzes/submit                    │   │
│  │  GET /api/v1/chapters/{id}                      │   │
│  │  POST /api/v1/payments/checkout                 │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Middleware (Authentication)            │   │
│  │  - JWT verification                             │   │
│  │  - Role-based access control (RBAC)             │   │
│  │  - Rate limiting                                │   │
│  │  - Request logging                              │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Controllers (Business Logic)            │   │
│  │  - studentController                            │   │
│  │  - chapterController                            │   │
│  │  - quizController                               │   │
│  │  - paymentController                            │   │
│  │  - adminController                              │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Services (External Integrations)       │   │
│  │  - stripeService (payments)                     │   │
│  │  - emailService (Postmark)                      │   │
│  │  - vimeoService (video tracking)                │   │
│  │  - storageService (S3 file uploads)             │   │
│  │  - certificateService (PDF generation)          │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Models (Data Abstraction Layer)         │   │
│  │  - TypeORM/Sequelize models                     │   │
│  │  - Validation rules                             │   │
│  │  - Relationships & constraints                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
    ↓                    ↓                    ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │   AWS S3     │  │    Stripe    │
│  Database    │  │  (PDFs, etc) │  │  (Payments)  │
│              │  │              │  │              │
│ 14 tables:   │  │ Certificates │  │ Webhooks     │
│ - users      │  │ Chapter PDFs  │  │              │
│ - chapters   │  │ Avatars      │  │              │
│ - quizzes    │  │              │  │              │
│ - payments   │  │              │  │              │
│ - etc        │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────────────────────────────────────────────┐
│              Third-Party Services                    │
│  Vimeo (Video), Postmark (Email), Sentry (Errors)   │
└──────────────────────────────────────────────────────┘
```

### Request Flow Example

```
User Login:
1. Client: POST /api/v1/auth/login { email, password }
2. Express Router: Receives request
3. Middleware: Check email format
4. Controller: authController.login()
5. Service: authService.validatePassword()
6. Model: User.findByEmail()
7. Database: SELECT * FROM users WHERE email = ?
8. Model: User instance returned
9. Service: Generate JWT token + refresh token
10. Controller: Format response
11. Express: Send JWT + httpOnly cookie
12. Client: Store token in memory, cookie auto-stored
13. Client: Can now make authenticated requests
```

---

## Technology Decisions

### Frontend Framework: React 18 + TypeScript

**Why React:**
- ✅ Large ecosystem & community support
- ✅ Component-based architecture
- ✅ Virtual DOM for performance
- ✅ Excellent developer tools
- ✅ Easy to learn & scale

**Why TypeScript:**
- ✅ Type safety catches bugs early
- ✅ Better IDE autocomplete
- ✅ Self-documenting code
- ✅ Refactoring confidence
- ✅ Team collaboration

**Why Tailwind CSS:**
- ✅ Utility-first approach (faster development)
- ✅ No CSS file hell
- ✅ Highly customizable
- ✅ Great responsive design support
- ✅ Small bundle size

### State Management: Redux Toolkit or Zustand

**Decision:** Use **Zustand** for simplicity (vs Redux for large teams)

**Zustand Benefits:**
- Less boilerplate than Redux
- Smaller bundle size (~2KB)
- Easier learning curve
- Hooks-based API
- Perfect for mid-size apps like this

**Store Structure:**
```typescript
// src/store/authStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  logout: () => set({ user: null, token: null })
}));
```

### Backend Framework: Node.js + Express

**Why Node.js:**
- ✅ JavaScript full-stack (frontend devs understand)
- ✅ Non-blocking I/O (great for API servers)
- ✅ Huge npm ecosystem
- ✅ Excellent REST API tooling
- ✅ Good performance for course platform

**Why Express:**
- ✅ Lightweight, unopinionated framework
- ✅ Excellent middleware system
- ✅ De facto standard for Node.js APIs
- ✅ Mature & stable
- ✅ Easy to test

### Database: PostgreSQL 14+

**Why PostgreSQL:**
- ✅ Relational data (perfect for courses)
- ✅ ACID transactions (payment safety)
- ✅ Strong data integrity constraints
- ✅ JSON support for quiz answers
- ✅ Full-text search (future forum feature)
- ✅ Open source & free
- ✅ DigitalOcean has managed option

### ORM: TypeORM

**Why TypeORM:**
- ✅ Type-safe (works with TypeScript)
- ✅ Decorators are clean & readable
- ✅ Excellent query builder
- ✅ Built-in validation
- ✅ Migration system
- ✅ Good documentation

**Alternative:** Sequelize (more mature, but less TypeScript-friendly)

---

## Development Workflow

### Creating a New Feature

**Example: Add "Video Bookmark" Feature**

#### Step 1: Create Database Schema
```bash
npm run migrate:create AddVideoBookmarks
```

Edit migration file:
```sql
CREATE TABLE video_bookmarks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  chapter_id UUID REFERENCES chapters(id),
  timestamp_seconds INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_bookmarks ON video_bookmarks(user_id);
```

Apply migration:
```bash
npm run migrate:up
```

#### Step 2: Create TypeORM Model
```typescript
// backend/src/models/VideoBookmark.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from './User';
import { Chapter } from './Chapter';

@Entity()
export class VideoBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.bookmarks, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Chapter, { onDelete: 'CASCADE' })
  chapter: Chapter;

  @Column()
  timestampSeconds: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

#### Step 3: Create Service
```typescript
// backend/src/services/bookmarkService.ts
export class BookmarkService {
  async createBookmark(userId: string, chapterId: string, timestamp: number) {
    const bookmark = new VideoBookmark();
    bookmark.user = { id: userId };
    bookmark.chapter = { id: chapterId };
    bookmark.timestampSeconds = timestamp;
    
    return await VideoBookmark.save(bookmark);
  }

  async getBookmarks(userId: string) {
    return await VideoBookmark.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' }
    });
  }
}
```

#### Step 4: Create Controller & Route
```typescript
// backend/src/controllers/bookmarkController.ts
export class BookmarkController {
  async saveBookmark(req, res) {
    const { chapterId, timestamp } = req.body;
    const bookmark = await bookmarkService.createBookmark(
      req.user.id,
      chapterId,
      timestamp
    );
    res.json({ success: true, data: bookmark });
  }
}

// backend/src/routes/bookmarks.routes.ts
router.post('/bookmarks', auth, bookmarkController.saveBookmark);
router.get('/bookmarks', auth, bookmarkController.getBookmarks);
```

#### Step 5: Create Frontend Component
```typescript
// frontend/src/components/chapter/VideoBookmarkButton.tsx
export function VideoBookmarkButton({ chapterId, currentTime }) {
  const handleBookmark = async () => {
    await api.post('/bookmarks', {
      chapterId,
      timestamp: Math.round(currentTime)
    });
    toast.success('Bookmark saved!');
  };

  return <button onClick={handleBookmark}>⭐ Bookmark</button>;
}
```

#### Step 6: Write Tests
```typescript
// backend/tests/bookmark.test.ts
describe('BookmarkService', () => {
  it('should create a bookmark', async () => {
    const bookmark = await bookmarkService.createBookmark(
      'user123',
      'ch1',
      300
    );
    expect(bookmark.timestampSeconds).toBe(300);
  });
});
```

#### Step 7: Commit & Push
```bash
git add .
git commit -m "feat: add video bookmarking feature"
git push origin feature/video-bookmarks
```

---

## Git & Version Control

### Branching Strategy: Git Flow

```
main (production)
 ↑
develop (staging)
 ↑
feature/feature-name (development)
```

### Commit Message Format

```
<type>: <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `perf`: Performance improvement
- `test`: Adding tests
- `docs`: Documentation changes
- `chore`: Build, dependencies, etc.

**Examples:**
```
feat: add video bookmarking feature

- Allow students to save timestamps in videos
- Store bookmarks in database
- Display bookmarks in video player

Closes #123

fix: correct quiz timer countdown

Fixes the bug where timer was counting up instead of down.

perf: optimize chapter progress queries

Add indexes on user_id and chapter_id to reduce query time from 500ms to 50ms.
```

### Pull Request Workflow

1. Create feature branch:
```bash
git checkout -b feature/my-feature
```

2. Commit regularly:
```bash
git commit -m "feat: work in progress"
```

3. Push to GitHub:
```bash
git push -u origin feature/my-feature
```

4. Create Pull Request on GitHub
   - Fill in description
   - Link any related issues
   - Request reviewers

5. GitHub Actions automatically:
   - Runs tests
   - Checks linting
   - Runs type checking

6. Address review comments

7. Merge when approved (squash commits recommended)

---

## Code Style & Standards

### TypeScript ESLint Config

```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/explicit-function-return-types": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "semi": "error",
    "quotes": ["error", "double"]
  }
}
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `user-service.ts` |
| Classes | PascalCase | `UserService` |
| Functions | camelCase | `getUserById` |
| Constants | CONSTANT_CASE | `MAX_ATTEMPTS` |
| Interfaces | PascalCase (prefix I) | `IUser` |
| React Components | PascalCase | `StudentDashboard` |

### Code Example

```typescript
// ✅ GOOD - Clear, typed, well-structured
interface IUserResponse {
  id: string;
  email: string;
  firstName: string;
}

async function getUserById(userId: string): Promise<IUserResponse> {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
  };
}

// ❌ BAD - Unclear, untyped, poor naming
async function getUser(id: any) {
  const u = await User.findById(id);
  return u ? u : null;
}
```

---

## Testing Strategy

### Test Pyramid

```
        🧪 E2E Tests (5%)
       Selenium, Cypress
          
      🔧 Integration Tests (20%)
     API ↔ Database, Stripe
        
     ✓ Unit Tests (75%)
  Functions, Services, Utils
```

### Backend Testing (Jest)

```bash
# Run all tests
npm run test

# Watch mode (re-run on file change)
npm run test:watch

# Specific test file
npm run test -- auth.test.ts

# Coverage report
npm run test:coverage

# Update snapshots
npm run test -- -u
```

**Example Unit Test:**
```typescript
describe('AuthService', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'SecurePass123!';
      const hash = await authService.hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should verify correct password', async () => {
      const password = 'SecurePass123!';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePass123!';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword('WrongPass', hash);
      expect(isValid).toBe(false);
    });
  });
});
```

### Frontend Testing (React Testing Library)

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Example Component Test:**
```typescript
describe('StudentDashboard', () => {
  it('should display progress bar', () => {
    const { getByRole } = render(
      <StudentDashboard progress={35} />
    );
    
    const progressBar = getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '35');
  });

  it('should show "Start Chapter" button if chapter not started', () => {
    const { getByText } = render(
      <ChapterCard chapter={{ status: 'locked' }} />
    );
    
    expect(getByText(/Start Chapter/i)).toBeInTheDocument();
  });
});
```

---

## Debugging & Logging

### Backend Logging

```typescript
import { logger } from './utils/logger';

// Info level (normal operations)
logger.info('User enrolled', { userId, courseId });

// Warn level (unexpected but handled)
logger.warn('Coupon nearly expired', { couponId, expiresIn: '3 days' });

// Error level (errors that need attention)
logger.error('Payment failed', { userId, amount, error });

// Debug level (development only)
logger.debug('Query took 150ms', { query, duration: 150 });
```

**Log Format:**
```json
{
  "timestamp": "2026-04-09T10:15:00Z",
  "level": "ERROR",
  "service": "paymentService",
  "message": "Payment failed",
  "userId": "user123",
  "error": "stripe_error_code_123",
  "context": { ... }
}
```

### Frontend Debugging

```typescript
// Use React DevTools browser extension
// https://react-devtools-tutorial.vercel.app/

// Console logging (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', state);
}

// Sentry error tracking (production)
import * as Sentry from "@sentry/react";

Sentry.captureException(error);
```

### Debugging Tools

**Browser DevTools:**
- Chrome DevTools (F12)
- Network tab (API calls)
- Console (errors)
- React DevTools extension

**Backend Debugging:**
```bash
# Run with Node debugger
node --inspect backend/src/server.ts

# In Chrome: chrome://inspect
# Set breakpoints, step through code
```

**VSCode Debugging:**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend",
      "program": "${workspaceFolder}/backend/src/server.ts",
      "cwd": "${workspaceFolder}/backend"
    }
  ]
}
```

---

## Common Development Tasks

### Add New API Endpoint

1. Create route in `routes/`
2. Create controller in `controllers/`
3. Create/update service in `services/`
4. Write tests in `tests/`
5. Update API docs in `docs/API.md`
6. Commit & push PR

### Add New Database Table

1. Create migration: `npm run migrate:create`
2. Define TypeORM model in `models/`
3. Create service methods in `services/`
4. Create API endpoint
5. Write tests
6. Update `docs/DATABASE.md`

### Debug API Error

```bash
# 1. Check logs
tail -f logs/error.log

# 2. Check database
psql -U postgres -d delaware_valley_drones

# 3. Test API manually
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/v1/students/dashboard

# 4. Check Sentry dashboard
https://sentry.io/organizations/dvd/

# 5. Use browser DevTools Network tab
```

---

## Resources

- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express Guide](https://expressjs.com/)
- [TypeORM Docs](https://typeorm.io/)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [Jest Testing](https://jestjs.io/)
- [Stripe API](https://stripe.com/docs)

---

**Last Updated:** April 2026  
**Ready for:** Phase 2 Backend Development
