# Complete DigitalOcean Setup Guide for DelawareValleyDrones.com

**Domain:** DelawareValleyDrones.com  
**Current Host:** GoDaddy  
**Application:** Node.js + PostgreSQL LMS Backend  
**Hosting:** DigitalOcean App Platform + Managed Database

---

## TABLE OF CONTENTS

1. [Create DigitalOcean Account](#1-create-digitalocean-account)
2. [Set Up GitHub Repository](#2-set-up-github-repository)
3. [Create Managed PostgreSQL Database](#3-create-managed-postgresql-database)
4. [Deploy Backend via App Platform](#4-deploy-backend-via-app-platform)
5. [Configure All Environment Variables](#5-configure-all-environment-variables)
6. [Add Domain to DigitalOcean](#6-add-domain-to-digitalocean)
7. [Update GoDaddy Nameservers](#7-update-godaddy-nameservers)
8. [Configure DNS Records](#8-configure-dns-records)
9. [SSL Certificate](#9-ssl-certificate)
10. [Run Database Migrations](#10-run-database-migrations)
11. [Configure Stripe Webhooks](#11-configure-stripe-webhooks)
12. [Verify Postmark Email](#12-verify-postmark-email)
13. [Test Everything](#13-test-everything)
14. [Set Up Monitoring](#14-set-up-monitoring)
15. [Ongoing Maintenance](#15-ongoing-maintenance)
16. [Cost Breakdown](#16-cost-breakdown)
17. [Troubleshooting Guide](#17-troubleshooting-guide)

---

## 1. Create DigitalOcean Account

### 1.1 Sign Up

1. Go to **https://www.digitalocean.com**
2. Click the green **"Sign Up"** button in the top right
3. Choose sign-up method (Email recommended for business)
4. Check your email for verification email from DigitalOcean
5. Click the verification link

### 1.2 Add Payment Method

1. Enter your credit card details
2. DigitalOcean will charge a small test amount to verify

> **💡 Tip:** DigitalOcean gives new users a **$200 free credit for 60 days**!

### 1.3 Create a Project

1. In the left sidebar, click **"Projects"**
2. Click **"+ New Project"**
3. Fill in:
   - **Project Name:** `Delaware Valley Drones LMS`
   - **Description:** `FAA Part 107 Remote Pilot Certification Course Website`
4. Click **"Create Project"**

---

## 2. Set Up GitHub Repository

Your backend code needs to be on GitHub for DigitalOcean to deploy it.

### 2.1 Create Repository

1. Go to **https://github.com**
2. Click **"+"** → **"New repository"**
3. Fill in:
   - **Repository name:** `delaware-valley-drones-lms`
   - **Visibility:** `Private`
   - **Add a README file:** Yes
4. Click **"Create repository"**

### 2.2 Push Your Code

```bash
cd "/Users/jfg/Documents/Abacus AI/Part 107 Certification Course/delaware-valley-drones-lms"

git init
git add .
git commit -m "Initial commit - LMS backend implementation"
git remote add origin https://github.com/YOUR_USERNAME/delaware-valley-drones-lms.git
git branch -M main
git push -u origin main
```

---

## 3. Create Managed PostgreSQL Database

This is your production database.

### 3.1 Create Database Cluster

1. In DigitalOcean, click **"Create"** → **"Databases"**
2. Select **PostgreSQL 15**
3. Configure:
   - **Cluster name:** `delaware-valley-drones-db`
   - **Plan:** Basic (1 GB RAM / 10 GB disk) = **$15/month**
   - **Region:** New York 3 (NYC3)
4. Click **"Create Database Cluster"**
5. **Wait 5-10 minutes** for the database to be created

### 3.2 Get Connection Details

Once created, click your database cluster and go to **"Overview"**. You'll see:
- **Host:** `db-postgresql-nyc3-XXXXX...`
- **Port:** `25060`
- **Database:** `defaultdb`
- **Username:** `doadmin`
- **Password:** (click "show")

**Copy all of these values!**

### 3.3 Create a Database for Your App

1. Go to **"Databases"** tab
2. Click **"Add new database"**
3. Name: `delaware_valley_drones_lms`
4. Click **"Save"**

---

## 4. Deploy Backend via App Platform

### 4.1 Create App

1. Click **"Create"** → **"Apps"**
2. Select **"GitHub"** as the source
3. Click **"Authorize DigitalOcean on GitHub"**
4. GitHub will ask for permission - click **"Authorize"**

### 4.2 Select Your Repository

1. Find and select: `delaware-valley-drones-lms`
2. Branch: `main`
3. Source directory: `backend`
4. Click **"Next"**

### 4.3 Configure App Resources

1. Service name: `api`
2. Build command: `npm install && npm run build`
3. Run command: `npm start`
4. HTTP port: `3000`
5. Click **"Next"**

### 4.4 Add Environment Variables

See Section 5 for the complete list. You'll add them after clicking **"Edit"** on your service.

### 4.5 Link to Database

1. Click **"Add Resource"** → **"Database"**
2. Select **"Previously created DigitalOcean database"**
3. Select `delaware-valley-drones-db`

### 4.6 Deploy

1. Review all settings
2. Click **"Create Resources"**
3. **Wait 5-10 minutes** for first deployment

### 4.7 Get Your Temporary URL

After deployment, you'll see a URL like: `https://delaware-valley-drones-lms-XXXXX.ondigitalocean.app`

Test it: `https://YOUR-APP-URL.ondigitalocean.app/health`

---

## 5. Configure All Environment Variables

In your App in DigitalOcean, go to **App Settings** → **Environment Variables**.

### 5.1 Database Variables

```
DB_HOST=db-postgresql-nyc3-XXXXX.b.db.ondigitalocean.com
DB_PORT=25060
DB_USERNAME=doadmin
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_DATABASE=delaware_valley_drones_lms
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false
DB_LOGGING=false
```

### 5.2 JWT Security

```bash
# In Terminal, run these to generate secure secrets
openssl rand -base64 48
openssl rand -base64 48  # Run twice, use different values
```

Then add:
```
JWT_SECRET=YOUR_FIRST_GENERATED_VALUE
JWT_REFRESH_SECRET=YOUR_SECOND_GENERATED_VALUE
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=30d
```

### 5.3 Stripe (use LIVE keys, not test)

From https://dashboard.stripe.com → Developers → API Keys (toggle to "Live"):
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (created in Section 11)
```

### 5.4 Postmark Email

From https://account.postmarkapp.com → Your Server → API Tokens:
```
POSTMARK_API_KEY=YOUR_SERVER_API_TOKEN
FROM_EMAIL=noreply@delawarevalleydrones.com
REPLY_TO_EMAIL=info@delawarevalleydrones.com
```

### 5.5 Other Variables

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
FRONTEND_URL=https://www.delawarevalleydrones.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 6. Add Domain to DigitalOcean

1. In DigitalOcean, click **"Networking"** → **"Domains"**
2. In the text box, type: `delawarevalleydrones.com`
3. Click **"Add Domain"**

---

## 7. Update GoDaddy Nameservers

> **⚠️ This takes 24-48 hours. Plan accordingly.**

### 7.1 DigitalOcean Nameservers

DigitalOcean uses these three nameservers (always the same):
```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

### 7.2 Update at GoDaddy

1. Go to **https://www.godaddy.com**
2. Sign in and go to **"Domain Portfolio"**
3. Find `delawarevalleydrones.com`
4. Click the **menu icon** → **"Manage DNS"** (or **"Manage All"**)
5. Scroll to **"Nameservers"**
6. Click **"Change"**
7. Select **"I'll use my own nameservers"**
8. Delete the old GoDaddy nameservers
9. Add the three DigitalOcean nameservers
10. Click **"Save"**

### 7.3 Check Propagation

Go to **https://dnschecker.org**:
1. Enter: `delawarevalleydrones.com`
2. Select: "NS" (nameserver)
3. Click "Search"
4. Watch as regions turn green as they propagate

---

## 8. Configure DNS Records

Once nameservers are pointing to DigitalOcean, configure your records:

1. **Networking** → **Domains** → `delawarevalleydrones.com`
2. Add these records:

| Type | Hostname | Value | TTL |
|------|----------|-------|-----|
| CNAME | @ | your-app.ondigitalocean.app. | 1800 |
| CNAME | www | your-app.ondigitalocean.app. | 1800 |
| CNAME | api | your-app.ondigitalocean.app. | 1800 |

(Replace `your-app.ondigitalocean.app` with your actual app URL)

---

## 9. SSL Certificate

DigitalOcean **automatically**:
- Provisions free SSL certificate from Let's Encrypt
- Renews it every 90 days
- Forces HTTPS redirect

**No action needed!** Just wait for DNS to propagate.

After DNS propagates, visit `https://delawarevalleydrones.com` and look for the padlock 🔒.

---

## 10. Run Database Migrations

### Option A: Via App Console

1. Go to your App in DigitalOcean
2. Click **"Console"** tab
3. Run:
```bash
npx typeorm migration:run -d dist/config/database.js
```

### Option B: From Your Machine

```bash
export DB_HOST="db-postgresql-nyc3-XXXXX.b.db.ondigitalocean.com"
export DB_PORT="25060"
export DB_USERNAME="doadmin"
export DB_PASSWORD="your-password"
export DB_DATABASE="delaware_valley_drones_lms"
export DB_SSL_ENABLED="true"
export DB_SSL_REJECT_UNAUTHORIZED="false"

cd backend
npm run build
npx typeorm migration:run -d dist/config/database.js
```

---

## 11. Configure Stripe Webhooks

### 11.1 Create Webhook

1. Go to **https://dashboard.stripe.com**
2. **Developers** → **Webhooks**
3. Click **"Add endpoint"**
4. **Endpoint URL:** `https://delawarevalleydrones.com/api/v1/payments/webhook`
5. Click **"Select events"**
6. Choose:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
7. Click **"Add endpoint"**

### 11.2 Get Webhook Secret

1. Click your new webhook
2. Find **"Signing secret"**
3. Click **"Reveal"**
4. Copy it (starts with `whsec_`)
5. Add to environment variables as `STRIPE_WEBHOOK_SECRET`

---

## 12. Verify Postmark Email

### 12.1 Create Account

Go to **https://postmarkapp.com** → **Sign Up Free** → Create account

### 12.2 Create Server

1. Click **"Create Server"**
2. Name: `Delaware Valley Drones LMS`
3. Click **"Create Server"**

### 12.3 Add Domain

1. Click **"Sender Signatures"**
2. Click **"Add Domain"**
3. Enter: `delawarevalleydrones.com`
4. Click **"Verify Domain"**

Postmark will show DNS records to add in DigitalOcean. Add them to your DNS records.

---

## 13. Test Everything

```bash
# Test API
curl https://delawarevalleydrones.com/health

# Test registration
curl -X POST https://delawarevalleydrones.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Test123!"}'

# Test login
curl -X POST https://delawarevalleydrones.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@delawarevalleydrones.com","password":"ChangeMe123!"}'
```

---

## 14. Set Up Monitoring

### 14.1 DigitalOcean Insights

1. Go to your App
2. Click **"Insights"** tab
3. See request count, errors, response times

### 14.2 Database Backups

1. Go to your database
2. Click **"Backups"** tab
3. Enable **"Automatic Backups"** (daily, 7 days retention)

### 14.3 Uptime Monitor

Go to **https://uptimerobot.com**:
1. Create free account
2. Add monitor:
   - **URL:** `https://delawarevalleydrones.com`
   - **Interval:** 5 minutes
3. Add your email for alerts

---

## 15. Ongoing Maintenance

### Deploy Updates

```bash
git add .
git commit -m "Update: description"
git push origin main
```

DigitalOcean automatically deploys within 2-3 minutes.

### View Logs

App → **"Runtime Logs"** tab shows all errors and requests in real-time.

---

## 16. Cost Breakdown

| Service | Plan | Cost/Month |
|---------|------|------------|
| App Platform | Basic (512MB) | $5 |
| PostgreSQL | Basic (1GB) | $15 |
| Domain (GoDaddy) | Standard | ~$2 |
| **TOTAL** | | **$22/month** |

**Annual: ~$260**  
**First 9 months covered by $200 DigitalOcean credit**

---

## 17. Troubleshooting Guide

### App Won't Deploy

1. Check deployment logs in DigitalOcean
2. Look for error message
3. Common causes:
   - Missing environment variable
   - Syntax error in code
   - npm install failure

**Fix:** Add missing variable or fix code, push again.

### Database Connection Failed

1. Check `DB_` environment variables (copy/paste carefully)
2. Verify DB_SSL_ENABLED=true and DB_SSL_REJECT_UNAUTHORIZED=false
3. Make sure database is running (check DigitalOcean dashboard)

**Test:** `psql "postgresql://doadmin:PASSWORD@HOST:25060/delaware_valley_drones_lms?sslmode=require"`

### Domain Not Working

1. Check DNS propagation at dnschecker.org
2. Verify nameservers changed in GoDaddy
3. Wait 24-48 hours if recently changed
4. Clear browser cache (Ctrl+Shift+Delete)

### Email Not Sending

1. Check Postmark activity log
2. Verify domain DNS records are correct
3. Check that sender signature is verified
4. Look in spam folder!

### Stripe Webhooks Not Received

1. Check Stripe webhook logs
2. Verify webhook URL is correct
3. Verify `STRIPE_WEBHOOK_SECRET` environment variable
4. Check app logs for webhook errors

---

## Quick Reference URLs

```
Your Site:     https://delawarevalleydrones.com
API:           https://delawarevalleydrones.com/api/v1
DigitalOcean:  https://cloud.digitalocean.com
GoDaddy:       https://www.godaddy.com/domain/manage
Stripe:        https://dashboard.stripe.com
Postmark:      https://account.postmarkapp.com
DNS Check:     https://dnschecker.org
```

---

**You're ready to launch! 🚀**

Follow the sections in order. Estimated total time: 2-3 hours (+ 24-48 hours for DNS propagation).

