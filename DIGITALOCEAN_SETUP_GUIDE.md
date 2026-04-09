# DigitalOcean Setup & Domain Migration Guide

**Domain:** DelawareValleyDrones.com  
**Current Host:** GoDaddy  
**Target:** DigitalOcean  
**Application:** FAA Part 107 LMS (Node.js + PostgreSQL)

---

## Overview

This guide covers:
1. Creating a DigitalOcean account
2. Setting up the infrastructure (App Platform & Database)
3. Migrating your domain from GoDaddy to DigitalOcean
4. Configuring DNS records
5. Setting up SSL certificates
6. Deploying your application

**Estimated Time:** 1-2 hours

---

## Part 1: DigitalOcean Account Setup

### Step 1: Create DigitalOcean Account

1. Go to [DigitalOcean.com](https://www.digitalocean.com)
2. Click **Sign Up**
3. Enter your email and password
4. Verify your email address
5. Add a payment method (credit card)
6. Create your account

### Step 2: Create a Project

1. In the DigitalOcean dashboard, go to **Projects**
2. Click **Create Project**
3. Name: `Delaware Valley Drones LMS`
4. Description: `FAA Part 107 Remote Pilot Certification Course`
5. Click **Create Project**

---

## Part 2: Infrastructure Setup on DigitalOcean

### Option A: Using App Platform (Recommended - Easier)

DigitalOcean App Platform is the easiest way to deploy - it handles builds, deployments, and scaling automatically.

#### Step 1: Create PostgreSQL Database

1. In your project, click **Create Resource** → **Database**
2. Select **PostgreSQL**
3. Configure:
   - Version: 14 (or latest)
   - Cluster Name: `delaware-valley-drones-lms-db`
   - Region: Choose closest to your users (e.g., `New York - NYC3`)
   - Database Engine: PostgreSQL
   - Number of Nodes: 1 (can scale later)
   - Size: Basic ($15/month) for starting
4. Click **Create Database Cluster**
5. **Wait 5-10 minutes** for creation
6. Once created, note these details:
   - **Host:** (e.g., `db-postgresql-nyc3-12345-do-user-123456-0.b.db.ondigitalocean.com`)
   - **Port:** `25060` (default)
   - **Database:** `defaultdb`
   - **Username:** `doadmin`
   - **Password:** (shown after creation)

#### Step 2: Create App Platform

1. Click **Create Resource** → **App**
2. Choose **GitHub** as source (or upload manually)
3. Select your repository: `delaware-valley-drones-lms`
4. Branch: `main`
5. Click **Next**

#### Step 3: Configure Components

**Backend Service:**
1. Set name: `api`
2. HTTP Port: `3000`
3. Build Command: `npm install && npm run build`
4. Run Command: `npm start`
5. Environment Variables (click **Edit Environment**):
   ```
   NODE_ENV=production
   PORT=3000
   
   # Database
   DB_HOST=<your-database-host>
   DB_PORT=25060
   DB_USERNAME=doadmin
   DB_PASSWORD=<your-database-password>
   DB_DATABASE=defaultdb
   DB_SSL_ENABLED=true
   DB_SSL_REJECT_UNAUTHORIZED=false
   
   # JWT
   JWT_SECRET=<generate-random-secure-key>
   JWT_REFRESH_SECRET=<generate-random-secure-key>
   
   # Stripe
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   # Postmark
   POSTMARK_API_KEY=your_postmark_token
   FROM_EMAIL=noreply@delawarevalleydrones.com
   
   # Frontend
   FRONTEND_URL=https://www.delawarevalleydrones.com
   ```
6. Click **Save**

**Frontend Service (Optional for Phase 3):**
- Add as separate component once frontend is ready
- Similar setup with `npm run build` → `npm start` or use `static` site

#### Step 4: Review and Deploy

1. Review all settings
2. Click **Create App**
3. Wait for deployment (5-10 minutes)
4. Once deployed, you'll get an auto-generated URL: `api-xxxxx.ondigitalocean.app`

---

### Option B: Using Droplets (More Control)

If you prefer traditional VPS hosting:

#### Step 1: Create Droplet

1. Click **Create Resource** → **Droplets**
2. Configure:
   - Image: Ubuntu 22.04 LTS
   - Size: Basic ($6-12/month)
   - Region: Closest to your users
   - VPC: Select your project VPC
   - Authentication: SSH key (recommended) or password
3. Click **Create Droplet**
4. Wait for creation (2-5 minutes)

#### Step 2: Connect via SSH

```bash
ssh root@<droplet-ip>
```

#### Step 3: Install Requirements

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL client
sudo apt-get install -y postgresql-client

# Install Git
sudo apt-get install -y git

# Install Nginx (reverse proxy)
sudo apt-get install -y nginx

# Install Certbot (SSL)
sudo apt-get install -y certbot python3-certbot-nginx
```

#### Step 4: Clone and Deploy

```bash
# Create app directory
sudo mkdir -p /var/www/delaware-valley-drones-lms
cd /var/www/delaware-valley-drones-lms

# Clone repository
sudo git clone https://github.com/your-username/delaware-valley-drones-lms.git .

# Install dependencies
cd backend
sudo npm install

# Create .env.production file
sudo nano .env.production
# Add all production environment variables

# Build
sudo npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start application
sudo pm2 start dist/server.js --name "dvd-lms-api"
sudo pm2 save

# Configure Nginx
sudo nano /etc/nginx/sites-available/delawarevalleydrones.com
```

---

## Part 3: Domain Migration from GoDaddy to DigitalOcean

### Step 1: Update Nameservers in GoDaddy

You have two options:
- **Option A:** Keep domain at GoDaddy, point to DigitalOcean nameservers (easiest)
- **Option B:** Transfer domain to DigitalOcean (more involved)

#### Option A (Recommended): Update Nameservers Only

1. Get DigitalOcean nameservers:
   - Go to DigitalOcean → **Project** → **Networking** → **Domains**
   - Add domain: `delawarevalleydrones.com`
   - DigitalOcean shows you 3 nameservers (ns1.digitalocean.com, etc.)
   - Copy these nameservers

2. Update GoDaddy settings:
   - Log into [GoDaddy.com](https://www.godaddy.com)
   - Go to **Domain Management** → **DNS**
   - Look for **Nameservers**
   - Click **Change Nameservers**
   - Replace with DigitalOcean nameservers
   - Save changes
   - **Wait 24-48 hours** for propagation

#### Option B: Transfer Domain to DigitalOcean

1. Unlock domain at GoDaddy:
   - Domain settings → **Security** → Unlock domain
   - Get **Authorization Code** (EPP code)

2. In DigitalOcean:
   - **Networking** → **Domains** → **Transfer Domain**
   - Enter domain and authorization code
   - Complete payment

3. Approve transfer in GoDaddy email

4. **Wait 3-5 days** for transfer completion

### Step 2: Add Domain to DigitalOcean

1. Go to **Networking** → **Domains**
2. Click **Add Domain**
3. Enter: `delawarevalleydrones.com`
4. If using nameserver approach, click **Use DigitalOcean Nameservers**
5. Click **Add Domain**

### Step 3: Configure DNS Records

In DigitalOcean DNS settings for your domain:

#### If using App Platform:
```
Type    Name        Value
-----------------------------------------------
CNAME   @           (your-app-url).ondigitalocean.app
CNAME   www         (your-app-url).ondigitalocean.app
```

#### If using Droplet:
```
Type    Name        Value
-----------------------------------------------
A       @           <droplet-ip>
A       www         <droplet-ip>
TXT     @           (for SPF: v=spf1 -all)
MX      @           mail.<your-mail-provider>
```

---

## Part 4: SSL Certificate Setup

### Option A: App Platform (Automatic)

DigitalOcean App Platform automatically provisions SSL certificates via Let's Encrypt. No additional action needed!

### Option B: Droplet with Nginx

```bash
# Configure Nginx for your domain
sudo nano /etc/nginx/sites-available/delawarevalleydrones.com
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name delawarevalleydrones.com www.delawarevalleydrones.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and test:
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/delawarevalleydrones.com /etc/nginx/sites-enabled/

# Test Nginx
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d delawarevalleydrones.com -d www.delawarevalleydrones.com

# Auto-renewal check
sudo certbot renew --dry-run
```

---

## Part 5: Environment Variables Needed

Create these on DigitalOcean:

### Essential Variables
```env
# Node/App
NODE_ENV=production
PORT=3000

# Database
DB_HOST=db-postgresql-nyc3-xxxxx.ondigitalocean.com
DB_PORT=25060
DB_USERNAME=doadmin
DB_PASSWORD=[from database credentials]
DB_DATABASE=defaultdb
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false

# JWT
JWT_SECRET=[generate with: openssl rand -base64 32]
JWT_REFRESH_SECRET=[generate with: openssl rand -base64 32]
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=30d

# Stripe
STRIPE_SECRET_KEY=sk_live_[your-stripe-key]
STRIPE_WEBHOOK_SECRET=whsec_[your-stripe-webhook-key]

# Postmark Email
POSTMARK_API_KEY=[your-postmark-token]
FROM_EMAIL=noreply@delawarevalleydrones.com

# Frontend
FRONTEND_URL=https://delawarevalleydrones.com

# Other
LOG_LEVEL=info
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### Generate Secure Keys
```bash
# Generate JWT secrets
openssl rand -base64 32
openssl rand -base64 32
```

---

## Part 6: Database Setup on Production

### Step 1: Connect to Remote Database

```bash
# Using psql from your local machine
psql -U doadmin \
  -h db-postgresql-nyc3-xxxxx.ondigitalocean.com \
  -p 25060 \
  -d defaultdb \
  --set=sslmode=require
```

### Step 2: Run Migrations

Option A: From your local machine
```bash
cd backend
DATABASE_URL="postgresql://doadmin:[password]@[host]:25060/defaultdb?sslmode=require" \
npm run typeorm migration:run
```

Option B: In deployed app (App Platform)
- Add build step: `npm run typeorm migration:run`
- Or SSH into droplet and run migrations

### Step 3: Verify Setup

```bash
psql -U doadmin -h [host] -p 25060 -d defaultdb --set=sslmode=require

# In psql:
\dt  # List tables
SELECT COUNT(*) FROM users;  # Check if seed data loaded
```

---

## Part 7: Deployment Process

### Using App Platform (Recommended)

1. Push code to GitHub
2. DigitalOcean automatically:
   - Pulls latest code
   - Runs build command
   - Runs migrations
   - Deploys new version
   - Updates SSL cert

### Using Droplet

```bash
cd /var/www/delaware-valley-drones-lms/backend

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run migrations
npm run typeorm migration:run

# Build
npm run build

# Restart with PM2
pm2 restart dvd-lms-api
```

---

## Part 8: Post-Deployment Checklist

- [ ] Domain DNS propagated (use [dnschecker.org](https://dnschecker.org))
- [ ] SSL certificate active (check URL shows lock icon)
- [ ] API responds on https://api.delawarevalleydrones.com (or root domain)
- [ ] Database connected and migrations ran
- [ ] Environment variables all set
- [ ] Email sending working (test with Postmark)
- [ ] Stripe webhook configured
- [ ] Monitoring/logging enabled
- [ ] Backups configured for database
- [ ] Status page set up for uptime monitoring

---

## Part 9: Ongoing Maintenance

### Monitoring

Set up alerts for:
- Application errors
- Database connectivity
- SSL certificate expiration
- Disk space

### Backups

```bash
# Enable automatic backups
# DigitalOcean → Database → Backups → Enable automated backups

# For Droplets, use:
sudo apt-get install -y backup-manager
```

### Updates

```bash
# Monthly: Update dependencies
npm outdated
npm update

# Quarterly: Security audit
npm audit fix

# As needed: Update Node version
# DigitalOcean App Platform: Update in settings
# Droplet: Download new Node version manually
```

---

## Costs Estimate

**Monthly Pricing:**
- App Platform Starter: $5/month (2GB RAM, 1 vCPU, 2GB disk)
- PostgreSQL Database (Basic): $15/month (1GB RAM, 1vCPU)
- Domain (if transferred): $10-12/year
- **Total: ~$20/month** (scales as you grow)

**Alternative with Droplet:**
- Droplet (2GB RAM): $12/month
- PostgreSQL Database (Basic): $15/month
- Domain: $10-12/year
- **Total: ~$27/month**

---

## Troubleshooting

### DNS Not Propagating

```bash
# Check DNS resolution
nslookup delawarevalleydrones.com
dig delawarevalleydrones.com

# Wait 24-48 hours for full propagation
# Use dnschecker.org to monitor
```

### SSL Certificate Error

```bash
# Renew certificate (if using Droplet)
sudo certbot renew --force-renewal

# Check certificate
sudo certbot certificates
```

### Database Connection Failed

```bash
# Test connection
psql -U doadmin -h [host] -p 25060 -d defaultdb --set=sslmode=require

# Check firewall rules in DigitalOcean
# Database must allow connections from App/Droplet IP
```

### App Not Starting

```bash
# Check logs
# App Platform: Logs tab
# Droplet: sudo pm2 logs
# Check environment variables are set
# Verify database connection
```

---

## Next Steps (After Deployment)

1. ✅ Deploy backend to DigitalOcean
2. ✅ Migrate domain & configure DNS
3. ✅ Set up SSL certificate
4. ⏳ Deploy frontend (Phase 3)
5. ⏳ Set up admin panel (Phase 4)
6. ⏳ Configure monitoring (Phase 5)

---

## Useful Resources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [DigitalOcean Database Docs](https://docs.digitalocean.com/products/databases/)
- [Domain Name System (DNS) Basics](https://docs.digitalocean.com/products/networking/dns/)
- [Stripe Webhook Setup](https://stripe.com/docs/webhooks)
- [Postmark SMTP](https://postmarkapp.com/smtp)

---

## Questions?

If you encounter issues:
1. Check DigitalOcean status page
2. Review application logs
3. Test database connectivity
4. Verify environment variables
5. Check DNS propagation

---

**Estimated Total Time:** 1-2 hours setup + 24-48 hours DNS propagation

Once domain is set up and DNS propagates, you'll be ready to deploy the frontend in Phase 3! 🚀
