# Phase 2 Quick Start Guide - Backend Development

## 🚀 Getting Started with Phase 2

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 13+ installed and running
- npm 9.x or higher
- Git

### Step 1: Install Dependencies

```bash
cd /workspace/delaware-valley-drones-lms/backend
npm install
```

This will install all required packages including:
- Express.js (web framework)
- TypeORM (database ORM)
- PostgreSQL driver
- JWT authentication
- Stripe SDK
- Testing frameworks (Jest, ts-jest)

### Step 2: Database Setup

#### Option A: Using Local PostgreSQL

```bash
# Create the development database
psql -U postgres -c "CREATE DATABASE delaware_valley_drones_dev;"

# Verify connection
psql -U postgres -d delaware_valley_drones_dev -c "\dt"
```

#### Option B: Using Docker

```bash
# Start PostgreSQL in Docker
docker run -d \
  --name dvd-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=delaware_valley_drones_dev \
  -p 5432:5432 \
  postgres:15-alpine

# Verify
docker exec dvd-postgres psql -U postgres -d delaware_valley_drones_dev -c "\dt"
```

### Step 3: Environment Setup

```bash
# Copy the example env file
cp .env.local .env

# The .env.local file already has development defaults
# For production, update the .env.example template and create .env
```

### Step 4: Start Development Server

```bash
# From /workspace/delaware-valley-drones-lms/backend directory
npm run dev
```

**Expected Output:**
```
  pino/9.0.0
  server: 🚀 Server running on http://localhost:3000
  server: 📝 Environment: development
  server: 🔐 CORS Origins: http://localhost:5173, http://localhost:3000, http://127.0.0.1:5173
```

### Step 5: Test the API

#### Register a new user:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "firstName": "John",
    "lastName": "Doe",
    "email": "student@example.com",
    "role": "student",
    "emailVerified": false,
    "isActive": true,
    "isBlocked": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": "24h"
  }
}
```

#### Login:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123"
  }'
```

#### Get Current User Profile:
```bash
# Use the accessToken from login response
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

#### Update Profile:
```bash
curl -X PUT http://localhost:3000/api/v1/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "firstName": "Jane",
    "bio": "Learning to fly drones!"
  }'
```

### Step 6: Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📝 Available NPM Commands

```bash
# Development
npm run dev              # Start with ts-node-dev (watches for changes)

# Production
npm run build            # Compile TypeScript to JavaScript
npm start                # Run compiled JavaScript

# Testing
npm test                 # Run Jest tests once
npm run test:watch      # Run Jest in watch mode
npm run test:coverage   # Run tests with coverage report

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run type-check      # TypeScript type checking

# Database
npm run migrate:create  # Create a new migration
npm run migrate:up      # Run pending migrations
npm run migrate:down    # Revert last migration

# Seeding
npm run seed:all        # Run all seed files
npm run seed:chapters   # Seed chapter data
npm run seed:questions  # Seed quiz questions
npm run seed:admin      # Seed admin user
```

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/services/__tests__/AuthService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="login"

# Run with coverage
npm run test:coverage
```

## 🐛 Debugging

### VS Code Debugging

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/node_modules/.bin/ts-node-dev",
      "args": ["--respawn", "--transpile-only", "src/server.ts"],
      "cwd": "${workspaceFolder}/backend",
      "runtimeArgs": ["--nolazy"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Enable Debug Logs

Set `LOG_LEVEL=debug` in `.env`:
```bash
LOG_LEVEL=debug npm run dev
```

## 📚 API Documentation

All endpoints are documented in `/docs/API.md` with:
- Request/response examples
- Authentication requirements
- Error codes and messages
- Rate limiting information

## 🔐 Security Notes

1. **Password Requirements**: Minimum 8 characters
2. **JWT Expiry**: Access tokens valid for 24 hours
3. **Refresh Token**: Valid for 30 days
4. **Rate Limiting**: 100 requests per 60 seconds
5. **CORS**: Only configured origins allowed
6. **Password Hashing**: bcrypt with 12 salt rounds

## ❌ Common Issues & Solutions

### Issue: Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: 
- Ensure PostgreSQL is running
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env`
- Create database: `createdb delaware_valley_drones_dev`

### Issue: Port 3000 Already in Use
```
Error: listen EADDRINUSE :::3000
```
**Solution**:
- Change `PORT` in `.env` to 3001 or another available port
- Or kill process: `lsof -ti:3000 | xargs kill -9`

### Issue: TypeScript Compilation Errors
```
Error: Cannot find module
```
**Solution**:
- Ensure dependencies are installed: `npm install`
- Clear cache: `npm run build`
- Check import paths in error message

### Issue: JWT Token Invalid
```
Error: Invalid token
```
**Solution**:
- Token may be expired (24h lifetime)
- Use refresh token endpoint to get new token
- Check `JWT_SECRET` is configured in `.env`

## 📦 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # TypeORM configuration
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication
│   │   └── errorHandler.ts      # Error handling
│   ├── models/                  # TypeORM entities (14 tables)
│   ├── routes/                  # API endpoint routes (7 files)
│   ├── services/                # Business logic
│   │   └── AuthService.ts       # Authentication service
│   ├── utils/
│   │   └── helpers.ts           # Utility functions
│   └── server.ts                # Express app entry point
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc.json
├── .env.local                   # Development environment
└── .env.example                 # Template for production
```

## 🎯 Phase 2 Milestones

- ✅ **Phase 2.1**: Backend foundation (COMPLETED)
  - Express server setup
  - TypeORM configuration
  - 14 database entities
  - JWT authentication
  - 7 API routes (auth + placeholders)

- ⏳ **Phase 2.2**: API Implementation (NEXT)
  - Student dashboard & progress
  - Chapter management
  - Quiz engine & auto-grading
  - Payment integration
  - Forum system

- ⏳ **Phase 2.3**: Testing & Optimization
  - Unit tests (80% coverage)
  - Integration tests
  - Performance optimization
  - API documentation

## 📞 Support

For issues or questions:
1. Check the error message and solutions above
2. Review logs in terminal (use `LOG_LEVEL=debug`)
3. Check API documentation in `/docs/API.md`
4. Verify environment variables in `.env`

---

**Ready to start?** Run `npm run dev` and begin building! 🚀
