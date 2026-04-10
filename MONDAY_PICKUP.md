# Monday Pickup Notes

Status snapshot and next-action plan from our weekend session ending **April 10, 2026**.

---

## TL;DR: Where you left off

You have a **deployed, authenticated, full-stack LMS** running on DigitalOcean. Backend, database, frontend, login, registration, and a protected user dashboard all work end-to-end. Real students can register and see their progress page. The next step is the **chapter detail page** so the chapter cards become clickable and you can start showing actual course content.

**Live URL:** https://delaware-valley-drones-lms-app-u8wzb.ondigitalocean.app/

---

## What works right now (verified live in production)

### Backend (`/api/v1/*`)

- Node + Express + TypeORM running on DigitalOcean App Platform
- Connected to DigitalOcean managed Postgres over TLS
- Schema bootstrapped (15 tables) and seeded with 13 chapters, quizzes, sample questions, and 3 promo coupons
- JWT auth: `JWT_SECRET` and `REFRESH_TOKEN_SECRET` set, signing and verification working
- Endpoints proven working in this session:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/register`
  - `GET /api/v1/chapters`
  - `GET /api/v1/students/progress`
- Many other endpoints exist but aren't yet exercised by the frontend (admin routes, gradebook, certificate, profile, payments, forum, quizzes — see `backend/src/routes/`)

### Frontend (`/`)

- React 18 + Vite + TypeScript + TailwindCSS + Zustand + React Router 6 + Axios
- Deployed as a Static Site component on the same DO app, sharing the domain with the backend
- Built routes:
  - `/` — public chapters page, lists all 13 chapters with quiz counts
  - `/login` — sign in form
  - `/register` — sign up form (5 fields with client + server validation)
  - `/dashboard` — **protected** route, redirects to `/login` if not authenticated, shows greeting + stat cards + progress bar + per-chapter list
- Header: shows Sign in / Sign up when logged out, user name + role + Dashboard + Sign out when logged in
- Auth state persists across page reloads (Zustand `persist` middleware → `localStorage`)
- Axios request interceptor automatically attaches `Authorization: Bearer <token>` to every API call
- Axios response interceptor catches 401 and clears local auth state

### Routing topology on DO

- `https://...ondigitalocean.app/` → static site (frontend)
- `https://...ondigitalocean.app/api/*` → backend service (with `Preserve Path Prefix` on)

### Credentials

Default seeded passwords were rotated this weekend. Real passwords are in your password manager (or your head). Seeded user emails:

- `admin@delawarevalleydrones.com` (admin)
- `instructor@delawarevalleydrones.com` (instructor)
- `student@example.com` (student)

If you registered any test accounts during this session (e.g. `test@example.com`, `test1@example.com`, `test2@example.com`), they're sitting in production. Clean them up when convenient via DO's Postgres console:

```sql
DELETE FROM users WHERE email LIKE 'test%@example.com';
```

---

## Commits this session, in order

```
d54d8ea  Initial commit: LMS backend implementation
0ef83d2  Fix TypeScript compilation errors for DigitalOcean deployment
e4c49b4  Push Claude fixes to web app
bf9b161  Fix pino-pretty runtime crash in production
32a29ef  Create DigitalOcean-deploy-errors
6c5ab52  Another 2 fixes              (DATABASE_URL parsing + better startup error logging)
ded69d2  Parse DATABASE_URL into discrete fields so ssl config is honored
820e801  More fixes                   (DB_SYNCHRONIZE env var + fixed seed migration)
087fa17  Fix migrate scripts and add default DataSource export
d0a96c9  Scaffold Vite + React + Tailwind frontend with Chapters page
223a2d0  Add login form, auth store, and React Router
5e089f4  Add registration form and /register route
b00c0fc  Add Sign up button to header
e61ee8c  Add protected /dashboard route with per-chapter progress
```

All pushed to `origin/main` and deployed.

---

## Architecture decisions worth remembering

1. **`DB_SYNCHRONIZE` is a one-shot env var.** It's currently `false` (or unset). Never turn it back on permanently — TypeORM will reconcile schema against entities and can drop columns. Use it only when you need to bootstrap a fresh database, then turn it off.

2. **The seed migration (`SeedInitialData1712700000000`) was rewritten** to use the actual entity column names. It uses `ON CONFLICT DO NOTHING` so it's safe to re-run. To run it on production: open the backend component's Console tab in DO and run `./node_modules/.bin/typeorm migration:run -d dist/config/database.js` (or `npm run migrate:up` after the package.json fix).

3. **`DATABASE_URL` is parsed manually** (not passed as a connection string to TypeORM) because `pg-connection-string` was upgrading `sslmode=require` to `verify-full`, which broke against DO's self-signed cert chain. See `backend/src/config/database.ts`.

4. **Frontend talks to backend via `/api/v1`** which is the path the DO routing forwards. The frontend's `VITE_API_URL` is set to `https://delaware-valley-drones-lms-app-u8wzb.ondigitalocean.app/api/v1` at build time on the static site component.

5. **The auth store uses an in-memory token holder (`src/api/token.ts`)** to break a circular dependency: `client.ts → store/auth.ts → api/auth.ts → client.ts`. The store pushes the token to the holder on login/logout/rehydrate, and the axios interceptor reads from the holder.

6. **The dashboard uses `GET /api/v1/students/progress`** (not `/students/dashboard`), because the dashboard endpoint returns `totalChapters: 0` for unenrolled users while the progress endpoint always returns all 13 chapters.

7. **The "Continue chapter" button on the dashboard currently links to `/`**, not to a real chapter page, because `/chapters/:id` doesn't exist yet. Fix this when building the chapter detail page.

---

## What is NOT done — prioritized to-do list for Monday

### 🔴 High priority (next session)

1. **Chapter detail page at `/chapters/:id`**
   - Make the chapter cards on `/` clickable (wrap in `<Link to={\`/chapters/\${id}\`}>`)
   - Add the route in `App.tsx` (probably wrap in ProtectedRoute, or leave public — your call)
   - New page fetches `GET /api/v1/chapters/:id`
   - Renders chapter content (currently `<p>Chapter content coming soon...</p>` for every chapter — see content priority below)
   - Adds a "Mark complete" button calling backend chapter progress endpoint
   - Adds a "Take quiz" button (disabled for now, becomes active when quiz UI lands)
   - Update DashboardPage's "Continue where you left off" button to link here instead of `/`
   - **Estimated:** 1 session

2. **Real Part 107 chapter content**
   - Every chapter currently says `"<p>Chapter content coming soon. Check back for video lessons and study materials.</p>"`
   - Every quiz has 10 placeholder questions named `"Sample Question N for Chapter N?"` with the correct answer always being "Option A (Correct)"
   - This is a content problem more than a code problem. Decide:
     - Will you write the content in Markdown / Google Docs / a structured JSON file?
     - Will you build an admin UI to type it in via the browser?
     - Will you write a one-time loader script that reads from a file and updates the DB?
   - Recommend: Markdown files + a one-time loader script, since the content is mostly static text + images + maybe Vimeo embed IDs.
   - **Estimated:** content authoring is the long pole; loader script is ~1 session

### 🟡 Medium priority (after chapter detail and content)

3. **Quiz UI at `/chapters/:id/quiz`**
   - Multiple choice questions, optional timer, submit, results screen with explanations
   - Calls `POST /api/v1/quizzes/:id/attempt` (or whatever the backend expects — confirm in `backend/src/routes/quizzes.ts`)
   - Updates the student's progress on success
   - **Estimated:** 1-2 sessions

4. **Forgot password flow**
   - Backend endpoint `POST /api/v1/auth/forgot-password` exists but is stubbed (doesn't actually send email)
   - Need: SMTP/Postmark configured (`POSTMARK_API_KEY` env var, sender domain, etc.)
   - Need: frontend `/forgot-password` page with email input
   - Need: backend implementation to actually send a reset email and handle the reset token
   - **Estimated:** 1 session, plus DNS work for sender domain verification

5. **Admin console at `/admin`**
   - Requires the `ProtectedRoute` `requireRole="admin"` prop (already supported)
   - Pages for: chapter CRUD, quiz CRUD, user management, view enrollments, view all quiz attempts
   - Backend endpoints exist at `/api/v1/admin/*` — see `backend/src/routes/admin.ts`
   - **Estimated:** 2-3 sessions

6. **Profile page at `/profile`**
   - Edit firstName, lastName, phone, bio, profile photo
   - Change password form
   - Backend endpoints already exist (`PUT /api/v1/auth/profile`, `PUT /api/v1/auth/change-password`)
   - **Estimated:** 1 session

### 🟢 Lower priority (after MVP learner experience works)

7. **Stripe payment integration**
   - Course is currently free / bypassed; nobody's actually paying
   - Frontend already has `@stripe/react-stripe-js` installed
   - Backend already has `stripe` SDK and `PaymentService.ts`
   - Need: Stripe API keys (`STRIPE_SECRET_KEY` on backend, `VITE_STRIPE_PUBLIC_KEY` on frontend)
   - Need: checkout UI, success/cancel pages, webhook handler for payment confirmation
   - Tied to the enrollment flow — payment unlocks an `Enrollment` row for the user
   - **Estimated:** 2-3 sessions, plus Stripe account setup

8. **Forum at `/forum`**
   - Backend has `POST /forum/posts`, `GET /forum/posts`, `POST /forum/posts/:id/replies`, etc.
   - Frontend has nothing yet
   - **Estimated:** 1-2 sessions

9. **Certificate at `/certificate`**
   - Backend has `Certificate` model and `GET /students/certificate`
   - PDF generation is probably not built yet — need to confirm
   - **Estimated:** 1-2 sessions

10. **Token refresh on 401**
    - Currently the response interceptor just logs the user out on 401
    - Should: when the access token expires, transparently call `POST /auth/refresh` with the refresh token, retry the original request
    - Not urgent: access tokens live 24h by default
    - **Estimated:** half session

### 🔵 Operational / nice-to-have

11. **Custom domain.** Point `learn.delawarevalleydrones.com` (or similar) at the DO app via the dashboard's Domains tab. Free SSL via DO.

12. **`/api/health` route.** Currently `/health` works inside the container (DO's readiness probe is fine) but `/api/health` from outside returns a JSON 404 because the backend only mounts `/health`. Trivial fix in `server.ts`: add `app.get('/api/health', ...)` alongside the existing `/health` handler.

13. **Pre-deploy migration job on DO.** Right now you'd manually open the backend component's Console tab to run migrations. The proper pattern is a **Pre-Deploy Job** in the DO app spec that runs `npm run migrate:up` before each deploy. Set this up before you start writing real schema migrations.

14. **Replace placeholder favicon.** Browser DevTools shows a 404 for `/favicon.ico` on every page load. Harmless but ugly. Add a real favicon to `frontend/public/`.

15. **`backend/src/routes/auth.ts` uses `pino()` directly** in a few places instead of the configured logger. Also, the `forgot-password` handler has a `// TODO: Implement password reset email logic` comment. Worth cleaning up when you tackle the email work.

16. **Tests.** Backend has a `tests/` directory and a Jest config but no tests written. Frontend has a `tests/` directory and Vitest installed but no tests. Adding even a smoke test for login would catch regressions.

17. **Error monitoring.** Sentry, LogRocket, or DO's built-in logs only? Decide before you have real users.

---

## Three security / housekeeping items still open

1. **`renoschubert`** — you said it's no longer an issue, but just noting we never verified what it was. If it ever resurfaces, check GitHub repo collaborators, deploy keys, GitHub Apps, and DO team members.

2. **Test accounts in production DB.** If you registered any throwaway accounts to test register/login (`test@example.com`, etc.), delete them.

3. **`ChangeMe123!` is committed in plaintext** to `backend/src/migrations/1712700000000-SeedInitialData.ts`. The seeded passwords have all been rotated, so the static commit is harmless now, but be aware that any future fresh database bootstrap would re-create those users with that default. If that's a problem, change the migration to hash a randomly-generated password and log it once (or remove the seeded users entirely from the migration and require manual creation).

---

## Recommended Monday opening move

**Build the chapter detail page (item 1).** It's the natural next step, it unlocks the "Continue chapter" button on the dashboard, and it sets up the URL structure for the eventual quiz page. About 1 session of work.

The opening prompt for Monday could be something like:

> "Pick up from MONDAY_PICKUP.md. Let's build the chapter detail page at /chapters/:id. Make the chapter cards on the home page clickable, fetch the chapter from the backend, render it, and update the dashboard's Continue button to link there."

That's enough for Monday to land somewhere meaningful.

---

## Useful repo paths

```
backend/
├── src/
│   ├── config/database.ts          ← DataSource, DATABASE_URL parsing, SSL config
│   ├── routes/                     ← All the express routes
│   │   ├── auth.ts
│   │   ├── chapters.ts
│   │   ├── students.ts
│   │   ├── quizzes.ts
│   │   ├── admin.ts
│   │   ├── payments.ts
│   │   ├── forum.ts
│   │   └── certificates.ts
│   ├── services/                   ← Business logic
│   ├── models/                     ← TypeORM entities (the source of truth for schema)
│   ├── middleware/auth.ts          ← authMiddleware + requireRole
│   └── migrations/                 ← Database migrations (only the seed exists right now)

frontend/
├── src/
│   ├── api/
│   │   ├── client.ts               ← axios instance + interceptors
│   │   ├── token.ts                ← in-memory token holder
│   │   ├── auth.ts                 ← login/register/logout/me
│   │   ├── chapters.ts             ← chapter list
│   │   └── students.ts             ← progress
│   ├── store/
│   │   └── auth.ts                 ← Zustand auth store
│   ├── components/
│   │   ├── Header.tsx              ← top nav, auth-aware
│   │   └── ProtectedRoute.tsx      ← auth wrapper
│   ├── pages/
│   │   ├── ChaptersPage.tsx        ← public catalog
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── DashboardPage.tsx       ← protected
│   └── App.tsx                     ← React Router setup
```

---

Have a good weekend.
