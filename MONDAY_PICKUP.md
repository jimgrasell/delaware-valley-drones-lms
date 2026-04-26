# LMS Pickup Notes

Status snapshot. Last updated **April 26, 2026** (end of session, just before context-window swap).

---

## TL;DR

The Delaware Valley Drones LMS is **live in production** at https://learn.delawarevalleydrones.com.

**As of today, ready for real paying students:**
- **14 chapters** of real Part 107 content (13 content + ch14 practice exam) with embedded figures
- **142 real practice questions** distributed across chapters by topic, **unlimited retakes**
- **Stripe live mode** at $99 — verified end-to-end with a real card on Apr 26 (charge + refund both worked)
- **Postmark production** — password reset, tier-aware quiz result emails, welcome email on enrollment, new-student admin notification
- **Admin console** — dashboard, students with payment history + deactivate/refund, chapters with inline edit + Vimeo, coupons CRUD
- **Custom domain** with SSL, pre-deploy migration job, app spec in git

The system is genuinely ready to open to real students. **Only one open task before the next session:** see "Open todos" below.

---

## Live URLs / IDs

- **Student-facing:** https://learn.delawarevalleydrones.com
- **GitHub:** https://github.com/jimgrasell/delaware-valley-drones-lms
- **DO app id:** `fe6b594d-7116-42d8-9f50-39a4f4fed6d9`
- **Project root on disk:** `/Users/forrest/claude-code/Part 107 Certification Course/delaware-valley-drones-lms`

## Seeded credentials

- `admin@delawarevalleydrones.com` (admin)
- `instructor@delawarevalleydrones.com` (instructor)
- `student@example.com` (student)

(Real passwords in James's password manager.)

---

## Recent commits (Apr 14 → Apr 26)

```
430dc14  Remove the 3-attempt retake cap on quizzes
ad45c5e  Send welcome email to student + new-enrollment notification to admin
779cc6c  Loader prints a "commit the figures" reminder after each successful run
c27d14f  Reload chapter figures to match Apr 26 content reload
9f4c611  Add chapter 6 (Sectional Charts) + shift others to make 14 total
9f44fa7  Rewrite MONDAY_PICKUP.md with Apr 13-14 work
7f981e7  Remap quiz questions to match realigned chapter topics
ed57319  Align chapter titles + descriptions with actual docx content
9209494  Set quiz passingScore to 70 (FAA Part 107 standard)
f46ccbc  Admin + quiz gating improvements
fcf41e4  Send tier-aware email after every quiz attempt
f06879d  Add coupon management to admin console
```

(`git log --oneline -50` for full history.)

---

## What changed since the prior pickup doc (Apr 14)

### Curriculum restructure (Apr 14 night → Apr 26 morning)

**Instructor inserted a new Chapter 6 ("Reading and Understanding Sectional Charts") between airspace classification (ch5) and airspace operations (now ch7). Old chapters 6–13 shifted down by one. Practice exam is now ch14. Total = 14 chapters.**

Implemented via:
- Migration `AddChapter6AndShift1776300000000` — shifted DB rows in reverse order to dodge unique-index conflicts on chapterNumber, inserted new ch6 + its quiz, retitled all 14 chapters from docx headings, renamed quiz titles. Existing student progress preserved (UUIDs unchanged, only chapterNumber values shifted).
- Loader scripts updated to target 1–14 (was 1–13).
- Quiz topic mapping updated: Airspace area now spans ch5/ch6/ch7; mixed mixed bucket is ch1+ch14.
- Content + quizzes reloaded against prod via `npm run content:load` + `npm run quiz:load`.
- Chapter figures recommitted to `frontend/public/content/chapters/` after reload (52 new image files, 47 deletions). Static-site build now serves the right images.

**Loader now prints a banner reminder** ("commit the figures") on every successful run so we don't repeat the broken-images mistake.

### Stripe live mode (Apr 26)

**Stripe activated and verified live on Apr 26.**

- Live mode webhook endpoint registered at `learn.delawarevalleydrones.com/api/v1/payments/webhook` listening for `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`.
- Live env vars on DO:
  - Backend: `STRIPE_SECRET_KEY` = `sk_live_…`, `STRIPE_WEBHOOK_SECRET` = `whsec_…` (live)
  - Static-site: `VITE_STRIPE_PUBLIC_KEY` = `pk_live_…`
- End-to-end smoke test: real-card $99 charge → enrollment created → admin refund → Stripe shows refunded.

### Welcome email + admin notification (Apr 26)

**Both fire from `handleCheckoutSessionCompleted` only when an enrollment is newly created** (no spam on webhook replays). Fire-and-forget.

- **Welcome email** (to student): updated content for current course shape — 14 chapters, 142 questions, current Ch1 title.
- **Admin notification** (`sendNewStudentAdminNotification`): NEW. Sends to `ADMIN_NOTIFICATION_EMAIL` env var, falls back to `FROM_EMAIL`. Includes student name, email, amount paid, coupon code/discount, ET timestamp, deep link to admin console.

### Quiz retake cap removed (Apr 26)

Migration `RemoveQuizRetakeLimit1777400000000` sets every quiz's `maxRetakes` to 0. Quiz model default also 0. Existing logic treats `maxRetakes <= 0` as "unlimited" so no service code change needed.

---

## Architecture decisions (carried forward — still important)

1. **`DB_SYNCHRONIZE` is one-shot.** Currently false. Never permanently true — TypeORM will reconcile schema and may drop columns.
2. **`DATABASE_URL` parsed manually**, not passed as URL string to TypeORM. `pg-connection-string` upgrades `sslmode=require` → `verify-full`, which breaks against DO's self-signed cert chain.
3. **In-memory token holder** (`frontend/src/api/token.ts`) holds both access + refresh tokens. Breaks circular dep between auth store / API client / response interceptor. Store pushes both tokens on login/logout/rehydrate.
4. **Chapter content is HTML** stored in DB, rendered via `dangerouslySetInnerHTML` inside Tailwind Typography `prose` container. Loaded by `loadChapterContent.ts` (mammoth-based, idempotent).
5. **Quiz questions** loaded via `loadQuizQuestions.ts` from `Part_107_Practice_Questions_Bank.txt`. Maps 5 FAA areas to chapters by topic. Idempotent (DELETE + INSERT per quiz).
6. **Both loader scripts use raw `pg.Client`** to sidestep bcrypt native-binary fragility on the dev machine.
7. **Admin/instructor bypass** on `canAccessChapter` (sequential progression) and `getQuizQuestions` (chapter-must-be-complete).
8. **DO Catchall Document = `index.html`** for the static site. Required for React Router on hard-loads.
9. **Quiz emails fire on every attempt.** Three tiers: `<passingScore` (failed), `passingScore..79` (passed-low), `>= 80` (passed-high). Fire-and-forget.
10. **Webhook uses `checkout.session.completed`** (not `payment_intent.succeeded`). `session.payment_intent` is null at session creation in current Stripe API versions; metadata.userId is the source of truth.
11. **Stripe is LIVE.** Test card `4242 4242…` no longer works. Real cards charge real money.
12. **Postmark in production**, sender `noreply@delawarevalleydrones.com`. 100/month free tier — upgrade to $15/mo (10K) before ~15 active students.
13. **Pre-deploy migration job** runs `npm run migrate:up` automatically before each deploy. Uses raw `node -e ...` (not TypeORM CLI) to dodge the strict-export check.

---

## Open todos

### 🔴 In progress when context ran out

- **Add `ADMIN_NOTIFICATION_EMAIL` env var on DO backend.** Already pushed the code (`ad45c5e`); just need to add the env var so notifications go to your inbox instead of `noreply@`. Steps:
  1. DO dashboard → Apps → app → Settings → click backend tile
  2. Environment Variables → Edit
  3. Add `ADMIN_NOTIFICATION_EMAIL` = `jim@delawarevalleydrones.com` (Run time scope)
  4. Save (triggers redeploy)

  Without this, admin notifications still fire — they just go to `noreply@delawarevalleydrones.com` which no one reads.

### 🟡 Pre-launch nice-to-haves

- **One real-person soft-launch test.** Send a friend a 100% off coupon, have them register → checkout → take a quiz. They'll find UX issues you can't see anymore.
- **Clean up the test student account** from Apr 26's live-card test. Refund cancelled their enrollment but the user row is still in production.
- **Welcome email content review** — I rewrote it for 14ch/142q but you should eyeball it once it lands in your inbox to confirm wording feels right.

### 🟢 Defer

- **#17 Sentry error monitoring.** Free tier is fine; not blocking.
- **Postmark plan upgrade** when student count crosses ~15.
- **Admin: bulk student export to CSV**, pinned/closed forum moderation UI, certificate as PDF (currently HTML print-to-PDF).
- **Welcome-email-on-registration vs on-payment.** Currently fires on payment (when enrollment is created). If you want users who register-but-don't-pay to get a "complete checkout" reminder, that's a separate email + flow.

---

## Useful commands

```bash
# Run backend tests
cd backend && npm test

# Reload chapter content from docx files (require Trusted Sources off)
cd backend && DATABASE_URL='postgresql://...' npm run content:load
# REMINDER: commit frontend/public/content/chapters/ after this!

# Reload quiz questions from text bank (require Trusted Sources off)
cd backend && DATABASE_URL='postgresql://...' npm run quiz:load

# Local dev
cd frontend && npm run dev   # vite on :5173, hits prod API via VITE_API_URL
cd backend && npm run dev    # ts-node-dev (bcrypt fragile on this machine — runs in DO container)
```

## Useful repo paths

```
backend/src/
  config/database.ts         ← DataSource, manual DATABASE_URL parsing
  routes/                    ← admin.ts, auth.ts, chapters.ts, payments.ts,
                                quizzes.ts, students.ts, forum.ts, certificates.ts
  services/
    AuthService.ts            ← JWT + reset tokens + change password
    ChapterService.ts         ← canAccessChapter (admin bypass)
    QuizService.ts            ← grading + tier emails (fire-and-forget)
    PaymentService.ts         ← Checkout Session + webhook handlers + welcome
                                  & admin-notify emails on enrollment
    EmailService.ts           ← Postmark; sendQuizResultEmail picks 1 of 3
                                  templates; sendNewStudentAdminNotification
    AdminService.ts           ← students list/detail (incl. payments),
                                  analytics, chapter mgmt
    CertificateService.ts     ← HTML certificate generation + verification
  models/                    ← TypeORM entities
  middleware/auth.ts         ← authMiddleware + requireRole(string|string[])
  scripts/
    loadChapterContent.ts     ← docx → HTML + extract figures, idempotent.
                                  Prints "commit the figures" reminder on success.
    loadQuizQuestions.ts      ← question bank .txt → quizzes, idempotent
  migrations/
    1712700000000-SeedInitialData.ts
    1776200000000-SetPassingScoreTo70.ts
    1776201000000-AlignChapterTitlesWithContent.ts
    1776300000000-AddChapter6AndShift.ts          ← Apr 14
    1777400000000-RemoveQuizRetakeLimit.ts        ← Apr 26

frontend/src/
  api/                       ← typed axios clients (auth, chapters, quizzes,
                                payments, forum, certificates, admin)
  store/auth.ts              ← Zustand persist, pushes tokens to in-memory holder
  pages/
    ChaptersPage.tsx         ← landing + catalog
    ChapterDetailPage.tsx    ← Vimeo + content + Mark Complete + Take Quiz gate
    QuizPage.tsx             ← three-phase quiz UI
    DashboardPage.tsx, ProfilePage.tsx
    CheckoutPage.tsx, PaymentSuccessPage.tsx, PaymentCancelledPage.tsx
    ForgotPasswordPage.tsx, ResetPasswordPage.tsx
    ForumPage.tsx, ForumPostPage.tsx
    CertificatePage.tsx, VerifyCertificatePage.tsx
    AdminPage.tsx + admin/*  ← Dashboard, Students, Chapters, Coupons tabs
  App.tsx                    ← React Router
public/content/chapters/chN/ ← extracted figures (committed; reload via loader)

.do/app.yaml                 ← exported app spec (secrets placeholdered)
```

---

## Resuming after context-window restart

Tell the new session:

> "Pick up the LMS work from MONDAY_PICKUP.md and `git log --oneline -25` on main.
> The current open task is adding the `ADMIN_NOTIFICATION_EMAIL` env var on
> the DO backend component. After that, the system is fully production-ready
> and the next priorities are listed under 'Open todos' in the doc."

The new session should be able to start immediately from there. Don't re-explain features that the doc + commit messages cover — they're comprehensive enough.

Last updated by Claude Opus 4.7 (1M context) on April 26, 2026.
