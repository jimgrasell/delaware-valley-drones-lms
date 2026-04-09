# Database Setup and Migrations Guide

## Overview

This guide covers setting up the PostgreSQL database, running migrations, and seeding initial data for the Delaware Valley Drones LMS backend.

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 22.x installed
- Environment variables configured in `.env.local`

## Initial Setup

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the course database
CREATE DATABASE delaware_valley_drones_lms;

# Create a dedicated user (optional but recommended)
CREATE USER drones_user WITH PASSWORD 'secure_password_here';
ALTER ROLE drones_user WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE delaware_valley_drones_lms TO drones_user;

# Exit psql
\q
```

### 2. Update Environment Variables

Edit `.env.local` with your PostgreSQL credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=drones_user
DB_PASSWORD=secure_password_here
DB_DATABASE=delaware_valley_drones_lms
DB_SYNCHRONIZE=false
DB_LOGGING=true

# SSL (optional, for production)
DB_SSL_ENABLED=false
DB_SSL_REJECT_UNAUTHORIZED=false
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

## Running Migrations

### Generate Migrations

When you modify entity files, generate migrations:

```bash
npm run typeorm migration:generate --name=YourMigrationName
```

### Run Migrations

Execute all pending migrations:

```bash
npm run typeorm migration:run
```

### Revert Migrations

To undo the last migration:

```bash
npm run typeorm migration:revert
```

### View Migration Status

```bash
npm run typeorm migration:show
```

## Seed Data

The seed migration `1712700000000-SeedInitialData.ts` automatically inserts:

- **3 test users**: 1 admin, 1 instructor, 1 student
- **13 course chapters**: All FAA Part 107 topics with descriptions
- **13 quizzes**: 10 questions each with multiple choice options
- **3 sample coupons**: EARLYBIRD (10% off), HOLIDAY20 (20% off), SAVE15 ($15 off)

### Initial Test Credentials

After running migrations, use these credentials to test:

**Admin User**
- Email: `admin@delawarevalleydrones.com`
- Password: `ChangeMe123!` (CHANGE AFTER FIRST LOGIN)

**Instructor User**
- Email: `instructor@delawarevalleydrones.com`
- Password: `ChangeMe123!` (CHANGE AFTER FIRST LOGIN)

**Test Student**
- Email: `student@example.com`
- Password: `ChangeMe123!` (CHANGE AFTER FIRST LOGIN)

## Development Workflow

### 1. Modify Entity

Update or create an entity file in `src/models/`:

```typescript
// Example: Adding a new column to User entity
@Column({ nullable: true })
bio: string;
```

### 2. Generate Migration

```bash
npm run typeorm migration:generate --name=AddBioToUser
```

### 3. Review Generated Migration

Check the generated migration file in `src/migrations/` and modify if needed.

### 4. Run Migration

```bash
npm run typeorm migration:run
```

### 5. Restart Development Server

```bash
npm run dev
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running:

```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
# Start PostgreSQL service from Services panel
```

### Database Does Not Exist

```
Error: database "delaware_valley_drones_lms" does not exist
```

**Solution**: Create the database as shown in step 1.

### Migration Already Executed

```
Error: Migration already executed
```

**Solution**: If you need to re-seed data, revert and re-run:

```bash
npm run typeorm migration:revert
npm run typeorm migration:run
```

### TypeORM Not Found

```
Error: Cannot find module 'typeorm'
```

**Solution**: Install dependencies:

```bash
npm install
```

## SQL Scripts

### View All Users

```sql
SELECT id, name, email, role, "createdAt" FROM users ORDER BY "createdAt" DESC;
```

### View All Chapters

```sql
SELECT id, title, "chapterNumber", published FROM chapters ORDER BY "chapterNumber" ASC;
```

### View Quiz Statistics

```sql
SELECT 
  q.title,
  COUNT(qa.id) as attempt_count,
  ROUND(AVG(qa.score), 2) as avg_score,
  SUM(CASE WHEN qa.passed THEN 1 ELSE 0 END) as passed_attempts
FROM quizzes q
LEFT JOIN quiz_attempts qa ON q.id = qa."quizId"
GROUP BY q.id, q.title;
```

### Reset All Data

**WARNING**: This deletes all data!

```bash
npm run typeorm migration:revert -- --all
npm run typeorm migration:run
```

## Production Considerations

1. **Backup**: Always backup your database before migrations
2. **Zero-Downtime Migrations**: Test migrations in staging first
3. **SSL Connection**: Enable SSL for production databases
4. **User Passwords**: Change default test passwords immediately
5. **Database Optimization**: Add indexes for frequently queried columns

## References

- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeORM Migrations](https://typeorm.io/migrations)
