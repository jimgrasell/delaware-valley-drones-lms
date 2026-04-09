# Delaware Valley Drones - Database Schema

**Platform:** PostgreSQL 14+  
**ORM:** TypeORM or Sequelize  
**Version:** 1.0  
**Last Updated:** April 2026

---

## Table of Contents
1. [Schema Overview](#schema-overview)
2. [Entity Relationship Diagram (ERD)](#entity-relationship-diagram-erd)
3. [Table Definitions](#table-definitions)
4. [Indexes & Performance](#indexes--performance)
5. [Migration Strategy](#migration-strategy)

---

## Schema Overview

**Core Entities:**
- **Users** - Student, instructor, admin accounts
- **Enrollments** - Student course enrollments & payment tracking
- **Chapters** - 13 course chapters with content
- **Quizzes** - Knowledge checks per chapter + practice exam
- **Questions** - 113+ assessment questions
- **Quiz Attempts** - Student quiz submission history
- **Chapter Progress** - Per-student chapter completion tracking
- **Payments** - Stripe payment records
- **Coupons** - Discount codes
- **Announcements** - Instructor course updates
- **Forum Posts/Replies** - Q&A discussion threads
- **Certificates** - Completion certificate records

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USERS (Authentication)                         │
├─────────────────────────────────────────────────────────────────────────┤
│ id (UUID, PK)          │ email (unique, indexed)                        │
│ first_name             │ password_hash (bcrypt)                         │
│ last_name              │ role: 'student' | 'instructor' | 'admin'       │
│ avatar_url             │ is_active (boolean)                            │
│ created_at             │ last_login (timestamp)                         │
│ updated_at             │                                                │
└─────────────────────────────────────────────────────────────────────────┘
                           ↓ 1:N ↓
        ┌──────────────────────┴──────────────────────┐
        ↓                                             ↓
┌──────────────────────┐                   ┌──────────────────────────┐
│   ENROLLMENTS        │                   │  CHAPTER_PROGRESS        │
├──────────────────────┤                   ├──────────────────────────┤
│ id (UUID, PK)        │                   │ id (UUID, PK)            │
│ user_id (FK→users)   │                   │ user_id (FK→users)       │
│ created_at           │                   │ chapter_id (FK→chapters) │
│ status: 'active'     │                   │ video_watched (bool)     │
│ | 'refunded'         │                   │ quiz_passed (bool)       │
│ | 'suspended'        │                   │ completed_at (timestamp) │
│ payment_intent_id    │                   │ time_spent_minutes (int) │
└──────────────────────┘                   └──────────────────────────┘
        ↓ 1:N                                          ↑ N:1
┌──────────────────────┐                              │
│     PAYMENTS         │                              │
├──────────────────────┤                              │
│ id (UUID, PK)        │                              │
│ user_id (FK→users)   │                              │
│ stripe_charge_id     │                              │
│ amount (cents)       │                              │
│ currency             │                              │
│ status: 'succeeded'  │                              │
│ | 'pending'          │                              │
│ | 'failed'           │                              │
│ | 'refunded'         │                              │
│ coupon_code (FK)     │                              │
│ created_at           │                              │
└──────────────────────┘                              │
        ↑ N:1                                         │
        │                                             │
┌──────────────────┐                  ┌──────────────────────┐
│    COUPONS       │                  │     CHAPTERS         │
├──────────────────┤                  ├──────────────────────┤
│ id (UUID, PK)    │                  │ id (UUID, PK)        │
│ code (unique)    │                  │ number: 1-13         │
│ discount_type    │                  │ title                │
│ | 'percent'      │                  │ description          │
│ | 'fixed'        │                  │ video_url (Vimeo)    │
│ discount_value   │                  │ pdf_url (S3)         │
│ max_uses         │                  │ order (int)          │
│ used_count       │                  │ is_published (bool)  │
│ expires_at       │                  │ created_at           │
│ is_active (bool) │                  │ updated_at           │
└──────────────────┘                  └──────────────────────┘
                                                ↓ 1:N ↓
                                 ┌──────────────────┴─────────────────┐
                                 ↓                                    ↓
                         ┌─────────────────┐            ┌──────────────────┐
                         │    QUIZZES      │            │   ANNOUNCEMENTS  │
                         ├─────────────────┤            ├──────────────────┤
                         │ id (UUID, PK)   │            │ id (UUID, PK)    │
                         │ chapter_id (FK) │            │ title            │
                         │ title           │            │ content          │
                         │ passing_score % │            │ created_by (FK)  │
                         │ time_limit_min  │            │ created_at       │
                         │ max_attempts    │            │ is_published     │
                         │ randomize_q (b) │            │ updated_at       │
                         │ created_at      │            └──────────────────┘
                         └─────────────────┘
                                ↓ 1:N
                         ┌─────────────────┐
                         │   QUESTIONS     │
                         ├─────────────────┤
                         │ id (UUID, PK)   │
                         │ quiz_id (FK)    │
                         │ question_text   │
                         │ type:           │
                         │ 'single_choice' │
                         │ 'multi_select'  │
                         │ explanation     │
                         │ order (int)     │
                         └─────────────────┘
                                ↓ 1:N
                         ┌─────────────────┐
                         │    OPTIONS      │
                         ├─────────────────┤
                         │ id (UUID, PK)   │
                         │ question_id(FK) │
                         │ option_text     │
                         │ is_correct (b)  │
                         │ order (int)     │
                         └─────────────────┘

QUIZ SUBMISSIONS:
┌──────────────────────────┐
│   QUIZ_ATTEMPTS          │
├──────────────────────────┤
│ id (UUID, PK)            │
│ user_id (FK→users)       │
│ quiz_id (FK→quizzes)     │
│ score (%)                │
│ passed (boolean)         │
│ started_at (timestamp)   │
│ completed_at (timestamp) │
│ answers_json (jsonb)     │ ← {"q1": "opt2", "q3": ["opt1", "opt2"]}
└──────────────────────────┘

FORUM:
┌──────────────────────────┐        ┌──────────────────────────┐
│   FORUM_POSTS            │        │   FORUM_REPLIES          │
├──────────────────────────┤        ├──────────────────────────┤
│ id (UUID, PK)            │        │ id (UUID, PK)            │
│ chapter_id (FK)          │        │ post_id (FK→posts)       │
│ user_id (FK→users)       │        │ user_id (FK→users)       │
│ title (question)         │        │ content (answer/reply)   │
│ content (question body)  │        │ created_at               │
│ created_at               │        │ updated_at               │
│ updated_at               │        │ is_instructor_reply (b)  │
│ is_answered (boolean)    │        └──────────────────────────┘
│ answered_by (FK→users)   │
└──────────────────────────┘

CERTIFICATES:
┌──────────────────────────┐
│   CERTIFICATES           │
├──────────────────────────┤
│ id (UUID, PK)            │
│ user_id (FK→users)       │
│ certificate_number       │ ← CERT-2026-XXXXX
│ issued_at (timestamp)    │
│ pdf_url (S3)             │
│ verification_token       │
│ public (boolean)         │
└──────────────────────────┘
```

---

## Table Definitions

### 1. USERS
Stores all user accounts (students, instructors, admins).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'instructor', 'admin')),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
);
```

**Key Constraints:**
- `email` is unique and case-insensitive (use LOWER() in queries)
- `role` restricted to 3 values (database-level validation)
- All timestamps are UTC

---

### 2. ENROLLMENTS
Tracks which students have enrolled and their payment status.

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'refunded', 'suspended')),
  payment_intent_id VARCHAR(255),
  
  UNIQUE(user_id),  -- One enrollment per student
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 3. CHAPTERS
The 13 course chapters with content metadata.

```sql
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL CHECK (number BETWEEN 1 AND 13),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url VARCHAR(500),  -- Vimeo embed URL
  pdf_url VARCHAR(500),    -- S3 PDF link
  order INT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE(number),
  INDEX idx_order (order),
  INDEX idx_published (is_published)
);
```

**Notes:**
- Chapters are numbered 1-13
- `video_url` stores the Vimeo embed link (https://vimeo.com/xxxxx)
- `pdf_url` stores the S3 URL to the chapter PDF

---

### 4. QUIZZES
Knowledge checks per chapter + final practice exam.

```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  passing_score INT NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  time_limit_minutes INT,  -- NULL = no time limit
  max_attempts INT,        -- NULL = unlimited retakes
  randomize_questions BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_chapter_id (chapter_id),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);
```

**Example:**
- Chapters 1-12: Chapter Quiz (time_limit_minutes=20, max_attempts=3)
- Chapter 13: Final Practice Exam (time_limit_minutes=120, max_attempts=3)

---

### 5. QUESTIONS
Individual assessment questions.

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL 
    CHECK (question_type IN ('single_choice', 'multi_select')),
  explanation TEXT,  -- Answer rationale shown after submission
  order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_quiz_id (quiz_id),
  INDEX idx_order (order),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);
```

**Total Questions:**
- Chapters 1-12: ~9-10 questions each = ~113 questions
- Chapter 13: 60-question practice exam

---

### 6. OPTIONS
Answer choices for each question.

```sql
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order INT NOT NULL,
  
  INDEX idx_question_id (question_id),
  INDEX idx_order (order),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
```

**Constraints:**
- At least one option must have `is_correct = true` per question
- Single-choice questions: exactly 1 correct option
- Multi-select questions: ≥1 correct options

---

### 7. CHAPTER_PROGRESS
Tracks each student's progress through the course.

```sql
CREATE TABLE chapter_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  video_watched BOOLEAN DEFAULT false,
  quiz_passed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,  -- NULL until fully complete
  time_spent_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, chapter_id),  -- One row per student per chapter
  INDEX idx_user_id (user_id),
  INDEX idx_chapter_id (chapter_id),
  INDEX idx_completed (completed_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);
```

**Completion Logic:**
```
Chapter is "complete" when:
- video_watched = true AND quiz_passed = true
- completed_at is set to CURRENT_TIMESTAMP
```

---

### 8. QUIZ_ATTEMPTS
Stores each quiz submission with answers and score.

```sql
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  answers_json JSONB NOT NULL,  -- {"question_id": ["option_id1", "option_id2"]} or {"question_id": "option_id"}
  
  INDEX idx_user_id (user_id),
  INDEX idx_quiz_id (quiz_id),
  INDEX idx_completed_at (completed_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);
```

**answers_json structure:**
```json
{
  "question_1_uuid": "option_2_uuid",          // single choice
  "question_5_uuid": ["option_1", "option_3"], // multi-select
  "question_12_uuid": "option_4"
}
```

---

### 9. PAYMENTS
Stripe payment records.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_charge_id VARCHAR(255) UNIQUE NOT NULL,
  amount INT NOT NULL,  -- in cents (e.g., 9999 = $99.99)
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  coupon_code_used UUID REFERENCES coupons(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_stripe_id (stripe_charge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 10. COUPONS
Discount codes for course enrollment.

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(10) NOT NULL 
    CHECK (discount_type IN ('percent', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,  -- e.g., 10 for 10% or 10.00 for $10
  max_uses INT,  -- NULL = unlimited
  used_count INT DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_active (is_active)
);
```

**Examples:**
- 10% off: `discount_type='percent', discount_value=10`
- $15 off: `discount_type='fixed', discount_value=15.00`

---

### 11. ANNOUNCEMENTS
Course-wide announcements from instructor.

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_published (is_published),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

---

### 12. FORUM_POSTS
Discussion forum questions per chapter.

```sql
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT false,
  answered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_chapter_id (chapter_id),
  INDEX idx_user_id (user_id),
  INDEX idx_answered (is_answered),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL
);
```

---

### 13. FORUM_REPLIES
Replies to forum posts.

```sql
CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_instructor_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 14. CERTIFICATES
Completion certificates for students.

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certificate_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., CERT-2026-ABC123XYZ
  issued_at TIMESTAMP NOT NULL,
  pdf_url VARCHAR(500),  -- S3 URL to generated PDF
  verification_token VARCHAR(100) UNIQUE NOT NULL,  -- for public verification
  public BOOLEAN DEFAULT false,  -- accessible without login
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_number (certificate_number),
  INDEX idx_verification (verification_token),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Indexes & Performance

### Recommended Indexes (beyond PRIMARY KEYs and UNIQUE constraints)

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(LOWER(email));
CREATE INDEX idx_users_role ON users(role);

-- Progress tracking
CREATE INDEX idx_chapter_progress_user_completed ON chapter_progress(user_id, completed_at);
CREATE INDEX idx_chapter_progress_chapter ON chapter_progress(chapter_id);

-- Quiz tracking
CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- Payment tracking
CREATE INDEX idx_payments_user_status ON payments(user_id, status);

-- Forum activity
CREATE INDEX idx_forum_posts_chapter ON forum_posts(chapter_id, created_at DESC);
CREATE INDEX idx_forum_replies_post ON forum_replies(post_id, created_at ASC);

-- Announcements
CREATE INDEX idx_announcements_published_created ON announcements(is_published, created_at DESC);
```

### Query Optimization Tips

1. **Avoid N+1 queries:** Always JOIN related tables instead of fetching separately
2. **Use LIMIT on listings:** Forum posts, announcements should paginate
3. **Cache user progress:** Keep in-memory cache of chapter_progress (invalidate on update)
4. **Archive old quiz attempts:** After 1 year, consider moving to archive table
5. **Partition payments table:** If volume exceeds 1M records, partition by year

---

## Migration Strategy

### Migration Files (Sequelize/TypeORM)

Create migrations in `/backend/src/migrations/`:

1. **001_initial_schema.sql**
   - Create all 14 tables
   - Add constraints & indexes
   - Add sample instructor user (James Grasell)

2. **002_seed_chapters.sql**
   - Load 13 chapter records
   - Set up chapter metadata (video_url=null, pdf_url=null for now)

3. **003_seed_questions.sql**
   - Load 113 chapter questions
   - Load 60-question practice exam
   - Link questions to quizzes

4. **004_add_performance_indexes.sql**
   - Add secondary indexes for common queries

Future migrations:
- Add new fields (e.g., `completion_certificate_template`)
- Schema changes (e.g., `chapters.difficulty_level`)

### Migration Command (TypeORM)

```bash
npm run typeorm migration:generate -- src/migrations/MigrationName
npm run typeorm migration:run
npm run typeorm migration:revert
```

### Rollback Strategy

Keep migration history:
```sql
-- View all applied migrations
SELECT * FROM typeorm_metadata WHERE type = 'migration';

-- Revert last migration
npm run typeorm migration:revert
```

---

## Data Validation Rules

### User Registration
- Email: valid email format, unique, lowercased
- Password: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
- First/Last Name: 2-100 chars, alphanumeric + spaces

### Quiz Submissions
- `score` must be 0-100
- `passed` = (score >= passing_score)
- `answers_json` must match question IDs & option IDs in database
- All questions must be answered (except optional questions if supported)

### Chapter Progress
- Cannot mark `completed_at` without both `video_watched` and `quiz_passed`
- `time_spent_minutes` is cumulative (never decreases)

---

## Backup & Recovery

### Daily Backup (DigitalOcean)
```bash
# Automated backup daily at 2:00 AM UTC
# Retention: 30 days
# Location: Separate storage region
```

### Manual Backup
```bash
pg_dump -U postgres -d delaware_valley_drones > backup.sql
```

### Restore from Backup
```bash
psql -U postgres -d delaware_valley_drones < backup.sql
```

---

## Future Extensions

**Planned for Phase 2:**
- Add `lesson_resources` table (downloadable PDFs per lesson)
- Add `student_notes` table (for note-taking feature)
- Add `video_progress` table (track % watched per student)

**Planned for Phase 3+:**
- `live_sessions` table (if adding instructor-led sessions)
- `certificates_revoked` table (audit trail)
- `audit_log` table (track all data changes)

---

## Database Connection

**Environment Variables:**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=delaware_valley_drones
DB_USER=postgres
DB_PASSWORD=your_secure_password
```

**Connection String:**
```
postgresql://postgres:password@localhost:5432/delaware_valley_drones
```

---

**Last Updated:** April 2026  
**Schema Version:** 1.0  
**Next Review:** After Phase 2 testing
