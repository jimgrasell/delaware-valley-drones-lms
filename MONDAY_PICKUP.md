# LMS Pickup Notes

Status snapshot. Last updated **April 14, 2026** (Tuesday morning session).

---

## TL;DR

The Delaware Valley Drones LMS is **production-ready** at https://learn.delawarevalleydrones.com with:

- 13 chapters of real Part 107 content (videos, written content, figures, quizzes)
- 142 real practice questions distributed across chapters by topic
- Stripe checkout at $99 (test mode — flip to live when ready)
- Postmark email (production-approved): password resets, tier-aware quiz result emails
- Admin console: dashboard, student management with payment history + deactivate/refund, chapter editing, coupon CRUD
- Custom domain with SSL, pre-deploy migration job, app spec in git

**Real students could register, pay, learn, take quizzes, and get certified today.** The remaining gaps are operational polish (Sentry error monitoring, more tests) and one open task: **end-to-end test pass against production with a real student account** before flipping Stripe to live mode.

---

## Live URLs

- **Student-facing:** https://learn.delawarevalleydrones.com
- **Backup:** https://delaware-valley-drones-lms-app-u8wzb.ondigitalocean.app (still live, will continue working)
- **GitHub:** https://github.com/jimgrasell/delaware-valley-drones-lms
- **DO app:** cloud.digitalocean.com/apps/fe6b594d-7116-42d8-9f50-39a4f4fed6d9

## Seeded credentials

- `admin@delawarevalleydrones.com` (admin)
- `instructor@delawarevalleydrones.com` (instructor)
- `student@example.com` (student) — passwords in your password manager

---

## What's built

### Student experience
- `/` — public landing page (hero with $99 pricing for visitors, chapter catalog for everyone)
- `/register` — sign-up form, auto-redirects to `/checkout` after success
- `/login`, `/forgot-password`, `/reset-password?token=…` — auth flow with Postmark password-reset emails
- `/checkout` — coupon input, Stripe-hosted card capture, redirects to `/payment-success` on completion (webhook creates enrollment)
- `/dashboard` — progress stats, "Continue where you left off", "Congratulations" banner + certificate link when course is complete
- `/profile` — edit name/phone/bio + change password
- `/chapters/:id` (auth-gated) — Vimeo video embed (when set) → written content → Mark Complete → Take Quiz button (gated on completion)
- `/chapters/:chapterId/quiz` (auth-gated, requires chapter complete) — multiple-choice quiz, results screen with answer review
- `/forum`, `/forum/:id` — community posts with replies (public reading, auth required to post)
- `/certificate` — generate after completing all 13 chapters; HTML download + shareable verification link
- `/verify/:verificationId` — public certificate verification (employer-friendly)

### Admin console (`/admin`)
- **Dashboard tab:** total/enrolled/completed students, completion rate, quiz stats, per-chapter engagement
- **Students tab:** paginated list (name, email, progress %, avg score, joined date, active status) + click-to-expand detail with: account/enrollment dates, payment history (amount, date, coupon, Stripe refund button per payment), per-chapter progress with chapter numbers + titles, deactivate/reactivate buttons
- **Chapters tab:** list all 13 chapters; inline edit form for title, description, Vimeo video ID
- **Coupons tab:** create coupons (percentage or fixed-amount, usage limit), enable/disable toggle, delete

### Backend
- Express + TypeORM + Postgres on DO App Platform
- JWT auth with **transparent token refresh on 401** (axios response interceptor calls `/auth/refresh` and retries the original request)
- Stripe webhooks at `/api/v1/payments/webhook` — handles `checkout.session.completed` (enrollment creation) and `payment_intent.succeeded`/`payment_intent.payment_failed` (legacy)
- Postmark email via `EmailService` — password reset, three-tier quiz result emails, welcome email scaffolded
- Coupon CRUD + Stripe refund endpoints under `/api/v1/admin/`

### Infrastructure
- **Custom domain** `learn.delawarevalleydrones.com` with free Let's Encrypt SSL via DO
- **Pre-deploy migration job** runs `npm run migrate:up` automatically before each deploy (uses raw `node -e ...` to bypass TypeORM CLI's strict export check)
- **App spec exported** to `.do/app.yaml` (secrets replaced with placeholders)
- **Branded SVG favicon**, `/api/health` route, Tailwind Typography plugin

---

## Recent commits (Apr 13–14)

```
7f981e7  Remap quiz questions to match realigned chapter topics
ed57319  Align chapter titles + descriptions with actual docx content
9209494  Set quiz passingScore to 70 (FAA Part 107 standard)
f46ccbc  Admin + quiz gating improvements
fcf41e4  Send tier-aware email after every quiz attempt
f06879d  Add coupon management to admin console
3071ec7  Add backend smoke tests for utility functions (#16)
7888a99  Fix pre-deploy migration: bypass TypeORM CLI export check
afcc0ae  Add DO app spec as .do/app.yaml (#18)
a3c988e  Add /api/health route + replace placeholder favicon
9f1e1fb  Add transparent token refresh on 401
89617a1  Add certificate generation, download, and public verification
a9a18b7  Add community forum UI
79ae1fa  Fix admin Students tab crash: match flat backend response shape
585d865  Fix webhook: handle checkout.session.completed for enrollment
7a84ffe  Redirect new registrations to /checkout + add Enroll button
ff87f1e  Fix Stripe checkout: skip empty product images array
1e248f2  Add Stripe checkout flow with $99 one-time payment
89a9ac1  Gate chapter content behind auth + add landing hero section
ed178a7  Add Vimeo video support to chapters
6a81f5a  Add profile page with edit profile and change password
c4d748b  Add admin console MVP with dashboard, students, and chapters tabs
09b9cd6  Add forgot-password / reset-password flow
```

(See `git log` for the full history back to the Apr 9–10 weekend session.)

---

## Architecture decisions to remember

1. **`DB_SYNCHRONIZE` is a one-shot env var.** Currently false. Never turn it back on permanently — TypeORM will reconcile schema against entities and can drop columns.

2. **`DATABASE_URL` is parsed manually** (not passed as a connection string to TypeORM) because `pg-connection-string` was upgrading `sslmode=require` to `verify-full`, which broke against DO's self-signed cert chain.

3. **In-memory token holder** (`frontend/src/api/token.ts`) holds both access and refresh tokens to break a circular dep between the auth store, the API client, and the response interceptor. The store pushes both tokens on login/logout/rehydrate.

4. **Chapter content is HTML stored in the DB** rendered via `dangerouslySetInnerHTML` inside a Tailwind Typography `prose` container. Loaded by `backend/src/scripts/loadChapterContent.ts` which uses mammoth to convert docx→HTML and extracts embedded images to `frontend/public/content/chapters/chN/`. Re-runnable, idempotent.

5. **Quiz questions are loaded via `backend/src/scripts/loadQuizQuestions.ts`** from `Part_107_Practice_Questions_Bank.txt` (in the user's content folder, not in the repo). Maps the 5 FAA knowledge areas to the chapters whose content covers them. Re-running deletes existing questions+options for each quiz and reinserts.

6. **Both loader scripts use raw `pg.Client`** (not TypeORM) to sidestep the bcrypt native-binary fragility on the dev machine. They run locally, hitting prod DB after toggling Trusted Sources off temporarily.

7. **Admin/instructor bypass on access gates.** `ChapterService.canAccessChapter` (sequential progression) and `QuizService.getQuizQuestions` (chapter-must-be-complete) both bypass for admin/instructor roles so you can preview without going through the student flow.

8. **DO Catchall Document = `index.html`** for the static site. Required for React Router on hard-loads. Set in dashboard; also documented in `.do/app.yaml`.

9. **Quiz emails fire on every attempt.** Three tiers, picked by score against `passingScore`:
   - `score < passingScore`: "Let's Review and Try Again" + study tips (tag: `quiz_failed`)
   - `passingScore..79`: "Passed! But You Can Do Even Better" (tag: `quiz_passed_low`)
   - `>= 80`: "Excellent Work! 🎯" (tag: `quiz_passed_high`)

   Fire-and-forget — Postmark failure never breaks the grade response.

10. **Webhook uses `checkout.session.completed`**, not `payment_intent.succeeded`. In current Stripe API versions, `session.payment_intent` is null at session creation, so the original PaymentIntent-matching logic returned 404. The session metadata carries `userId` directly.

11. **Stripe is in test mode.** `sk_test_...` and `pk_test_...` keys. Test card `4242 4242 4242 4242`. Webhook endpoint registered for `checkout.session.completed` + `payment_intent.succeeded` + `payment_intent.payment_failed`. To go live: switch keys, register a new webhook endpoint with the live URL, update env vars.

12. **Postmark is production-approved.** Verified domain `delawarevalleydrones.com` (DKIM + Return-Path). Sends from `noreply@delawarevalleydrones.com`. Free tier is 100 emails/month — upgrade to $15/mo (10K emails) before ~20 active students.

---

## Open todos

### 🟢 Quick wins / hygiene

- **End-to-end production test** with a real student account (jgrasell@gmail.com or similar). The full 10-test checklist is in chat history. Everything is wired up but no one has done a complete student-perspective run-through yet. Do this **before** flipping Stripe to live.
- **#17: Sentry error monitoring** — only remaining item from the original pickup-doc todo list. Free tier (5K errors/month) is plenty. Setup is ~30 min: create account, two projects (lms-backend, lms-frontend), set DSNs as env vars, init in code.
- Clean up test student accounts in production DB (any leftover `test@…` or fake-named accounts).
- Verify the deactivate/refund flow with a real test payment+refund cycle.

### 🟡 Pre-launch

- **Switch Stripe to live mode.** Steps:
  1. Activate live mode in Stripe dashboard
  2. Replace `STRIPE_SECRET_KEY` (`sk_test_…` → `sk_live_…`) on the DO backend env vars
  3. Replace `VITE_STRIPE_PUBLIC_KEY` (`pk_test_…` → `pk_live_…`) on the DO static-site env vars
  4. Create a new webhook endpoint pointing at `learn.delawarevalleydrones.com/api/v1/payments/webhook`, listening to the same three events
  5. Replace `STRIPE_WEBHOOK_SECRET` with the new live signing secret
  6. Test with a real card you control, then refund yourself
- **Postmark plan upgrade** when student count grows. Currently 100/month free tier.
- **Welcome email** — `EmailService.sendWelcomeEmail` exists but isn't called from the registration flow. Wire it into `POST /auth/register` if you want new students to get a welcome email.

### 🔵 Future enhancements

- Quiz UI improvements: timer, question-by-question nav, save-and-resume
- Forum: edit/delete UI for own posts (backend already supports), pinned/closed admin moderation UI
- Certificate: actual PDF download (currently HTML — browser print-to-PDF works but isn't ideal). Could add `puppeteer` or similar.
- Admin console: quiz CRUD (currently can only edit chapters; quiz questions are managed via the loader script)
- Admin: bulk student actions (export to CSV, bulk email, etc.)
- Tests: extend smoke tests to cover routes (currently only utility-function tests)

---

## Useful commands

```bash
# Run backend tests
cd backend && npm test

# Reload chapter content from docx files (requires Trusted Sources off)
cd backend && DATABASE_URL='postgresql://...' npm run content:load

# Reload quiz questions from text bank (requires Trusted Sources off)
cd backend && DATABASE_URL='postgresql://...' npm run quiz:load

# Local dev
cd frontend && npm run dev   # vite on :5173, hits prod API via VITE_API_URL
cd backend && npm run dev    # ts-node-dev (bcrypt issue on this machine — runs in DO container)

# Push DO app spec changes
doctl apps update fe6b594d-7116-42d8-9f50-39a4f4fed6d9 --spec .do/app.yaml
```

## Useful repo paths

```
backend/
├── src/
│   ├── config/database.ts           ← DataSource, manual DATABASE_URL parsing
│   ├── routes/                      ← All Express routes
│   ├── services/
│   │   ├── AuthService.ts            ← JWT + reset tokens + change password
│   │   ├── ChapterService.ts         ← canAccessChapter (admin bypass)
│   │   ├── QuizService.ts            ← grading + tier-aware email fire-and-forget
│   │   ├── PaymentService.ts         ← Stripe Checkout Session creation, webhook handlers
│   │   ├── EmailService.ts           ← Postmark; sendQuizResultEmail picks 1 of 3 templates
│   │   ├── AdminService.ts           ← students list/detail, analytics, chapter mgmt
│   │   └── CertificateService.ts     ← HTML certificate generation + verification
│   ├── models/                       ← TypeORM entities (source of truth for schema)
│   ├── middleware/auth.ts            ← authMiddleware + requireRole (accepts string or string[])
│   ├── scripts/
│   │   ├── loadChapterContent.ts     ← docx → HTML + extracted images, re-runnable
│   │   └── loadQuizQuestions.ts      ← question bank .txt → quizzes, re-runnable
│   └── migrations/                   ← run automatically pre-deploy on DO
│       ├── 1712700000000-SeedInitialData.ts            ← initial seed
│       ├── 1776200000000-SetPassingScoreTo70.ts        ← Apr 14 fix
│       └── 1776201000000-AlignChapterTitlesWithContent.ts ← Apr 14 fix

frontend/
├── src/
│   ├── api/                          ← typed axios clients
│   │   ├── client.ts                  ← shared axios w/ auto refresh on 401
│   │   ├── token.ts                   ← in-memory token holder (access + refresh)
│   │   ├── auth.ts, chapters.ts, quizzes.ts, students.ts,
│   │   │   payments.ts, forum.ts, certificates.ts, admin.ts
│   ├── store/auth.ts                 ← Zustand persist, pushes tokens to holder
│   ├── components/
│   │   ├── Header.tsx                ← role-aware nav (Forum, Enroll, Admin links)
│   │   └── ProtectedRoute.tsx        ← supports requireRole prop
│   ├── pages/
│   │   ├── ChaptersPage.tsx          ← landing + catalog
│   │   ├── ChapterDetailPage.tsx     ← Vimeo + content + Mark Complete + Take Quiz gate
│   │   ├── QuizPage.tsx              ← three-phase quiz UI
│   │   ├── DashboardPage.tsx         ← progress + cert CTA
│   │   ├── CheckoutPage.tsx, PaymentSuccessPage.tsx, PaymentCancelledPage.tsx
│   │   ├── ForgotPasswordPage.tsx, ResetPasswordPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── ForumPage.tsx, ForumPostPage.tsx
│   │   ├── CertificatePage.tsx, VerifyCertificatePage.tsx
│   │   ├── AdminPage.tsx             ← tab nav (Dashboard, Students, Chapters, Coupons)
│   │   └── admin/
│   │       ├── DashboardTab.tsx
│   │       ├── StudentsTab.tsx       ← detail w/ payments, deactivate, refund
│   │       ├── ChaptersTab.tsx
│   │       └── CouponsTab.tsx
│   └── App.tsx                       ← React Router
└── public/content/chapters/chN/      ← extracted figures (committed)

.do/app.yaml                          ← exported app spec (secrets placeholdered)
```

---

## Resuming after context-window restart

If a fresh Claude session needs to pick this up:

1. Tell it: **"Pick up from MONDAY_PICKUP.md and `git log --oneline -30` on main."**
2. Mention any specific area you want to work on; the doc is comprehensive but won't beat a focused goal.
3. Verified-working features don't need re-explanation — trust the doc + commit messages.

Last updated by Claude Opus 4.7 (1M context) on April 14, 2026.
