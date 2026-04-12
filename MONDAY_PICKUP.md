# Monday Pickup Notes

Status snapshot and next-action plan. Last updated **end of day Monday April 11, 2026** (after Monday evening session).

---

## TL;DR: Where you left off

You have a **deployed, authenticated, full-stack LMS** running on DigitalOcean with **real Part 107 chapter content** loaded into all 13 chapters. Every chapter renders proper headings, lists, paragraphs, and figures (47 embedded PNGs extracted from the source docx files). Students can register, browse chapters, and read the real course material. The biggest remaining pieces are **quizzes** (questions are still placeholder, and there's no quiz UI yet) and **enrollment/payments** (course is currently free to anyone who registers).

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
  - `/` — public chapters page, lists all 13 chapters with quiz counts; each card is a `<Link>` to `/chapters/:id`
  - `/chapters/:id` — public chapter detail page; fetches `GET /api/v1/chapters/:id`, renders real Part 107 content via `dangerouslySetInnerHTML` inside a Tailwind Typography `prose` container (headings, lists, images all styled), shows Mark Complete button for authenticated users, disabled Take Quiz stub. Images served from `/content/chapters/chN/image-*.png` (static-site assets).
  - `/login` — sign in form
  - `/register` — sign up form (5 fields with client + server validation)
  - `/dashboard` — **protected** route, redirects to `/login` if not authenticated, shows greeting + stat cards + progress bar + per-chapter list; Continue button links to `/chapters/:id`
- Header: shows Sign in / Sign up when logged out, user name + role + Dashboard + Sign out when logged in
- Auth state persists across page reloads (Zustand `persist` middleware → `localStorage`)
- Axios request interceptor automatically attaches `Authorization: Bearer <token>` to every API call
- Axios response interceptor catches 401 and clears local auth state

### Routing topology on DO

- `https://...ondigitalocean.app/` → static site (frontend)
- `https://...ondigitalocean.app/api/*` → backend service (with `Preserve Path Prefix` on)
- Static-site **Catchall Document** is set to `index.html` (set via DO dashboard → App → static-site component → Settings → Custom Pages). This makes React Router work on hard-loads, refreshes, and shared deep links like `/chapters/:id` and `/dashboard`. Without it, anything other than `/` returns a 404. **This setting currently only lives in the DO dashboard — not in git.** See operational item #18 below.

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

## Commits through this session, in order

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
061762d  Add MONDAY_PICKUP.md status doc
dacb499  Add chapter detail page at /chapters/:id         ← Monday Apr 11
a05030c  Add Claude Code launch config for frontend dev   ← Monday Apr 11
c903693  Update MONDAY_PICKUP.md after Monday Apr 11      ← Monday Apr 11
e48c72e  Add chapter content loader and real Part 107 content ← Monday Apr 11 PM
```

All pushed to `origin/main` and deployed. Note: the Apr 11 **DO Catchall fix** is NOT a commit — it was made directly in the DO dashboard. See operational item #18.

**Monday evening also touched the prod DB directly** (no commit) by running `backend/npm run content:load` against the dev Postgres with `DATABASE_URL` exported. This upserted `chapters.content` and set `isPublished = true` for all 13 chapters. Re-running the loader is idempotent — it does not create new rows, just refreshes the content column.

---

## Architecture decisions worth remembering

1. **`DB_SYNCHRONIZE` is a one-shot env var.** It's currently `false` (or unset). Never turn it back on permanently — TypeORM will reconcile schema against entities and can drop columns. Use it only when you need to bootstrap a fresh database, then turn it off.

2. **The seed migration (`SeedInitialData1712700000000`) was rewritten** to use the actual entity column names. It uses `ON CONFLICT DO NOTHING` so it's safe to re-run. To run it on production: open the backend component's Console tab in DO and run `./node_modules/.bin/typeorm migration:run -d dist/config/database.js` (or `npm run migrate:up` after the package.json fix).

3. **`DATABASE_URL` is parsed manually** (not passed as a connection string to TypeORM) because `pg-connection-string` was upgrading `sslmode=require` to `verify-full`, which broke against DO's self-signed cert chain. See `backend/src/config/database.ts`.

4. **Frontend talks to backend via `/api/v1`** which is the path the DO routing forwards. The frontend's `VITE_API_URL` is set to `https://delaware-valley-drones-lms-app-u8wzb.ondigitalocean.app/api/v1` at build time on the static site component.

5. **The auth store uses an in-memory token holder (`src/api/token.ts`)** to break a circular dependency: `client.ts → store/auth.ts → api/auth.ts → client.ts`. The store pushes the token to the holder on login/logout/rehydrate, and the axios interceptor reads from the holder.

6. **The dashboard uses `GET /api/v1/students/progress`** (not `/students/dashboard`), because the dashboard endpoint returns `totalChapters: 0` for unenrolled users while the progress endpoint always returns all 13 chapters.

7. ~~**The "Continue chapter" button on the dashboard currently links to `/`**, not to a real chapter page, because `/chapters/:id` doesn't exist yet.~~ **Fixed Apr 11** — links to `/chapters/${nextChapter.chapterId}`.

8. **Chapter content is rendered via `dangerouslySetInnerHTML`** in `ChapterDetailPage.tsx` because the content is HTML strings. Fine for now because content only comes from the loader script writing into the DB, but when the admin content editor is built (item #5), sanitize on input OR switch this to a markdown/sanitized renderer. Don't let untrusted user input flow through this path.

9. **Mark Complete button calls `PUT /api/v1/chapters/:id/mark-completed` directly.** Per `ChapterService`, that endpoint may require a pre-existing progress row with `videoWatched: true` — this wasn't verified end-to-end because I didn't have login credentials during testing. If it 400s on first click from a fresh account, either also hit `mark-watched` first or loosen the backend's precondition.

10. **Chapter content loader uses raw `pg` instead of TypeORM's `AppDataSource`.** Reason: importing the `Chapter` entity transitively pulls in `User`, which imports `bcrypt`, which has a broken native binary on the current dev machine (Linux aarch64 .so where a Mac Mach-O should be). The loader only runs a single UPDATE, so a `pg.Client` is simpler than fixing bcrypt. See `backend/src/scripts/loadChapterContent.ts`. If you ever fix bcrypt (`rm -rf node_modules/bcrypt && npm install --build-from-source`, which will need working Xcode CLT), you can switch the loader to use AppDataSource like the rest of the backend.

11. **Chapter images live in `frontend/public/content/chapters/chN/` and are committed to git.** Total ~10MB. They ship with the frontend static-site build, served from `/content/chapters/chN/image-{hash}.{ext}`. The image filenames are content-hashed so re-running the loader with unchanged docx files is a no-op on disk. If a chapter's content changes, the per-chapter directory is wiped and re-populated — old orphan images don't accumulate.

12. **Content loader needs the dev-db `Trusted Sources` toggle off to run from your Mac.** The dev DB under this app has a binary toggle (no IP allow-list), so running the loader locally means disabling Trusted Sources, running, and re-enabling. Always remember to re-enable afterward. When you reach operational item #18 (export DO app spec to `.do/app.yaml`) this becomes a reason to also migrate off the dev-db tier to a full managed cluster that supports IP allow-lists.

---

## What is NOT done — prioritized to-do list for Monday

### 🔴 High priority (next session)

1. ~~**Chapter detail page at `/chapters/:id`**~~ ✅ **Done Apr 11** (commit `dacb499`). Route is public; Mark Complete is auth-gated inside the component. Authenticated flow was not verified end-to-end — worth a quick smoke test next time you're logged in.

2. ~~**Real Part 107 chapter content**~~ ✅ **Done Apr 11 PM** (commit `e48c72e`). Loader script `backend/src/scripts/loadChapterContent.ts` reads the 13 `Chapter_N_KDP_Ebook.docx` files from `../../Part 107 Certification Course/` and upserts HTML into `chapters.content`. All 13 chapters rendered with real content on production. Loader is re-runnable whenever the source docx files change — just toggle dev-db Trusted Sources off, run, toggle it back on.

### 🟡 Medium priority — now the most important open work

**The natural next move is #3 (quiz UI) + #3b (real quiz questions), because content is landed and quizzes are the only remaining piece of the core learning loop.**

3. **Quiz UI at `/chapters/:id/quiz`**
   - Multiple choice questions, optional timer, submit, results screen with explanations
   - Calls `POST /api/v1/quizzes/:id/attempt` (confirm the exact shape in `backend/src/routes/quizzes.ts`)
   - Updates the student's progress on success; wires into the existing `ChapterProgress` table
   - Activates the currently-disabled "Take quiz" button on `ChapterDetailPage.tsx`
   - **Estimated:** 1-2 sessions

3b. **Real quiz questions** (parallel with or after #3)
   - Source: `/Users/forrest/claude-code/Part 107 Certification Course/Part 107 Certification Course/Part_107_Practice_Questions_Bank.txt` (68KB plain text file with a bank of practice questions already written)
   - Current DB state: every quiz has 10 placeholder questions named `"Sample Question N for Chapter N?"` with correct answer always being "Option A (Correct)". Need to replace these.
   - Approach options:
     - **Extend the existing loader** (`backend/src/scripts/loadChapterContent.ts`) to also parse the practice questions file and replace `questions` + `question_options` rows for each quiz. Same script, same run pattern.
     - **Write a separate loader** (`loadQuizQuestions.ts`) so concerns stay separated.
   - Recommend the extended loader approach since it's one less file and one less command to remember — but only if parsing the .txt format is trivial. Read the first ~200 lines of the file to assess before committing.
   - Delete-and-recreate semantics for quiz questions (they have no natural key; simplest is to DELETE existing questions+options for each quiz, then INSERT fresh).
   - **Estimated:** 1 session if the .txt format is clean; 2 sessions if it needs significant massaging.

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

18. **Export the DO app spec to `.do/app.yaml` (IaC).** Currently the DO app is configured entirely via the dashboard. As of Apr 11, that dashboard-only config includes the critical **Catchall Document = `index.html`** setting that makes SPA deep links work — if you ever recreate the app, tear down the component, or spin up a staging env, you have to remember to click that again. Fix this by:
    - `brew install doctl && doctl auth init`
    - `doctl apps spec get fe6b594d-7116-42d8-9f50-39a4f4fed6d9 > .do/app.yaml`
    - Review the exported YAML, confirm `catchall_document: index.html` is in the static-site entry, confirm env var `Encrypted` secrets aren't dumped in plaintext (DO redacts them but double-check), commit it
    - From then on, edit `.do/app.yaml` in git and run `doctl apps update <id> --spec .do/app.yaml` (or wire it into a deploy hook)
    - **Estimated:** 1 session. Best done together with item #11 (custom domain) and #13 (pre-deploy migration job), both of which also want spec-level control.

---

## Three security / housekeeping items still open

1. **`renoschubert`** — you said it's no longer an issue, but just noting we never verified what it was. If it ever resurfaces, check GitHub repo collaborators, deploy keys, GitHub Apps, and DO team members.

2. **Test accounts in production DB.** If you registered any throwaway accounts to test register/login (`test@example.com`, etc.), delete them.

3. **`ChangeMe123!` is committed in plaintext** to `backend/src/migrations/1712700000000-SeedInitialData.ts`. The seeded passwords have all been rotated, so the static commit is harmless now, but be aware that any future fresh database bootstrap would re-create those users with that default. If that's a problem, change the migration to hash a randomly-generated password and log it once (or remove the seeded users entirely from the migration and require manual creation).

---

## Recommended next opening move

**Do #3b first (real quiz questions from the practice bank), then #3 (quiz UI).**

Reasoning: the quiz UI needs real questions to even be meaningfully testable. If you build the UI first against placeholder questions you'll just have to re-test it later against real ones. Question loading is probably faster than UI work anyway (~1 session if the .txt parses cleanly), and once real questions are in the DB, the UI work has a much tighter feedback loop.

Suggested opening prompt:

> "Pick up from MONDAY_PICKUP.md. Start with item #3b: extend the chapter content loader to also load quiz questions from `Part_107_Practice_Questions_Bank.txt`. Read the file first to understand the format, then plan. After that's working, we'll move to #3 (quiz UI)."

Don't forget: running the loader against prod means toggling **Trusted Sources off** on the dev-db (DO dashboard → App → dev-db-057722 → Settings → Trusted Sources → Edit → uncheck → Save), running the loader, then toggling it **back on**. Or, better, use the session to finally do operational item #18 and migrate to a real managed cluster so this stops being a recurring chore.

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
│   │   ├── ChaptersPage.tsx        ← public catalog (cards are Links to /chapters/:id)
│   │   ├── ChapterDetailPage.tsx   ← public; Mark Complete is auth-gated inside
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── DashboardPage.tsx       ← protected
│   └── App.tsx                     ← React Router setup
├── public/
│   └── content/chapters/chN/       ← extracted chapter figures (committed to git, ~10MB total)
└── tailwind.config.js              ← @tailwindcss/typography plugin enabled

backend/src/scripts/
└── loadChapterContent.ts           ← run via `npm run content:load` (see decision #10)
```

---

Last updated end of Mon Apr 11, 2026 PM session.
