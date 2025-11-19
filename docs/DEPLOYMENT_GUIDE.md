# NextCRM Production Deployment Guide

This guide provides step-by-step instructions for deploying NextCRM with enterprise-grade infrastructure to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Security Configuration](#security-configuration)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup Strategy](#backup-strategy)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Services

- **MongoDB**: Atlas or self-hosted (v5.0+)
- **Node.js**: v18.17.0 or higher
- **Stripe Account**: For payment processing
- **SSL Certificate**: For HTTPS (required)
- **Domain**: Configured with DNS

### Optional Services

- **Redis**: For distributed rate limiting (recommended for multi-instance deployments)
- **Cloudinary/S3**: For document storage
- **SendGrid/Resend**: For email notifications
- **Sentry**: For error monitoring

## Pre-Deployment Checklist

### Code Review

- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] Dependencies updated
- [ ] No console.log statements in production code
- [ ] Environment variables documented

### Security Review

- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Audit logging functional
- [ ] HTTPS enforced
- [ ] Database access restricted
- [ ] API keys rotated

### Database Review

- [ ] Migration scripts prepared
- [ ] Indexes optimized
- [ ] Backup strategy defined
- [ ] Connection pooling configured

## Database Setup

### 1. MongoDB Configuration

#### Option A: MongoDB Atlas (Recommended)

1. Create a new cluster in MongoDB Atlas
2. Configure network access (whitelist deployment IPs)
3. Create database user with appropriate permissions
4. Get connection string

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

#### Option B: Self-Hosted MongoDB

1. Install MongoDB (v5.0+)
2. Configure authentication
3. Set up replica set (recommended)
4. Configure firewall rules

### 2. Run Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Verify schema
npx prisma db pull
```

### 3. Create Indexes

```bash
# Run index creation script
npx prisma migrate deploy
```

### 4. Verify Database

```bash
# Test connection
npx prisma studio
```

## Environment Configuration

### 1. Create Production Environment File

Create `.env.production`:

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
DATABASE_URL=mongodb+srv://...

# Authentication
JWT_SECRET=<generate-secure-random-string>
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-secure-random-string>

# OAuth Providers (Optional)
GOOGLE_ID=...
GOOGLE_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Email (Optional)
RESEND_API_KEY=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...

# Storage (Optional)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Monitoring (Optional)
SENTRY_DSN=...
```

### 2. Generate Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure Stripe Webhooks

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## Security Configuration

### 1. SSL Certificate

Ensure SSL certificate is properly configured:

```bash
# Test SSL configuration
curl -I https://your-domain.com

# Verify HSTS header
curl -I https://your-domain.com | grep Strict-Transport-Security
```

### 2. Verify Security Headers

```bash
# Check all security headers
curl -I https://your-domain.com | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security"
```

### 3. Configure Firewall

Allow only necessary ports:
- 443 (HTTPS)
- 22 (SSH - restrict to specific IPs)

Block:
- 27017 (MongoDB - should only be accessible internally)
- 3000 (Next.js dev port)

### 4. Rate Limiting Configuration

For production with multiple instances, configure Redis:

```typescript
// lib/rate-limit.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Update rate limit storage to use Redis
```

## Deployment Steps

### Option 1: Vercel Deployment (Recommended)

1. **Connect Repository**
   ```bash
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard > Project > Settings > Environment Variables
   - Add all variables from `.env.production`

3. **Configure Build Settings**
   - Build Command: `npx prisma generate && next build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 2: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies
   FROM base AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci

   # Build application
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npx prisma generate
   RUN npm run build

   # Production image
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production

   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static

   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t nextcrm .
   docker run -p 3000:3000 --env-file .env.production nextcrm
   ```

### Option 3: Traditional Server Deployment

1. **Build Application**
   ```bash
   npm ci
   npx prisma generate
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

3. **Configure Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start npm --name "nextcrm" -- start
   pm2 save
   pm2 startup
   ```

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "up" },
    "stripe": { "status": "up" }
  }
}
```

### 2. Test Authentication

1. Navigate to `https://your-domain.com`
2. Register a new account
3. Verify email (if configured)
4. Log in successfully

### 3. Test Rate Limiting

```bash
# Check rate limit status
curl -H "Authorization: Bearer <token>" \
  https://your-domain.com/api/rate-limit
```

### 4. Verify Security Headers

```bash
curl -I https://your-domain.com | grep -E "X-Frame-Options|Strict-Transport-Security"
```

### 5. Test Stripe Integration

1. Create a test organization
2. Navigate to billing page
3. Start checkout session
4. Complete test payment
5. Verify subscription created

### 6. Test Audit Logging

1. Perform some actions (create contact, update account)
2. Navigate to audit logs page
3. Verify logs are captured

### 7. Test Data Export

1. Navigate to settings > data export
2. Request data export
3. Verify export completes
4. Download and verify data

## Monitoring Setup

### 1. Health Check Monitoring

Set up monitoring service to poll health endpoint:

```bash
# Example: Using uptime monitoring service
curl https://your-domain.com/api/health
```

Alert if:
- Response status is not 200
- Response time > 2000ms
- Database check fails

### 2. Error Monitoring

Configure Sentry (optional):

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### 3. Log Management

Set up log aggregation:

```bash
# Example: Using Papertrail
npm install winston-papertrail
```

### 4. Performance Monitoring

Monitor:
- API response times
- Database query performance
- Rate limit usage
- Storage usage

### 5. Audit Log Monitoring

Set up alerts for:
- Failed login attempts (>5 in 10 minutes)
- Role changes
- Organization deletions
- Data exports

## Backup Strategy

### 1. Database Backups

#### MongoDB Atlas
- Enable automatic backups (configured in Atlas)
- Retention: 7 days minimum
- Test restore procedure monthly

#### Self-Hosted MongoDB
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$DATABASE_URL" --out="/backups/mongodb-$DATE"

# Compress
tar -czf "/backups/mongodb-$DATE.tar.gz" "/backups/mongodb-$DATE"
rm -rf "/backups/mongodb-$DATE"

# Upload to S3
aws s3 cp "/backups/mongodb-$DATE.tar.gz" s3://your-backup-bucket/

# Clean old backups (keep 30 days)
find /backups -name "mongodb-*.tar.gz" -mtime +30 -delete
```

### 2. Environment Variables Backup

Store encrypted backup of `.env.production`:

```bash
# Encrypt
gpg -c .env.production

# Store securely (not in git)
aws s3 cp .env.production.gpg s3://your-secrets-bucket/
```

### 3. Document Storage Backup

If using Cloudinary/S3, enable versioning and lifecycle policies.

### 4. Audit Log Archive

Archive audit logs older than 90 days:

```typescript
// scripts/archive-audit-logs.ts
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

const oldLogs = await prismadb.auditLog.findMany({
  where: { createdAt: { lt: ninetyDaysAgo } }
});

// Export to S3
await s3.upload({
  Bucket: 'audit-log-archive',
  Key: `audit-logs-${Date.now()}.json`,
  Body: JSON.stringify(oldLogs)
});

// Delete from database
await prismadb.auditLog.deleteMany({
  where: { createdAt: { lt: ninetyDaysAgo } }
});
```

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to MongoDB

**Solutions**:
1. Check network access whitelist in MongoDB Atlas
2. Verify connection string format
3. Test connection with mongo shell
4. Check firewall rules

```bash
# Test connection
mongosh "$DATABASE_URL"
```

### Rate Limiting Issues

**Problem**: Users getting rate limited incorrectly

**Solutions**:
1. Check rate limit configuration
2. Review audit logs for suspicious activity
3. Verify organization plan
4. Clear rate limit cache

```bash
# Check rate limit status
curl https://your-domain.com/api/rate-limit
```

### Stripe Webhook Failures

**Problem**: Webhooks not being received

**Solutions**:
1. Verify webhook endpoint is accessible
2. Check webhook secret matches
3. Review Stripe webhook logs
4. Test with Stripe CLI

```bash
# Test webhook
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger customer.subscription.created
```

### Performance Issues

**Problem**: Slow API responses

**Solutions**:
1. Check database indexes
2. Review slow query logs
3. Enable Redis caching
4. Optimize rate limit checks

```bash
# Check health endpoint response time
time curl https://your-domain.com/api/health
```

### Security Header Issues

**Problem**: Security headers not being applied

**Solutions**:
1. Verify next.config.js configuration
2. Check CDN/proxy settings
3. Test with curl

```bash
curl -I https://your-domain.com
```

## Rollback Procedure

If deployment fails:

1. **Revert Code**
   ```bash
   vercel rollback
   # or
   git revert <commit-hash>
   git push
   ```

2. **Restore Database**
   ```bash
   mongorestore --uri="$DATABASE_URL" /backups/mongodb-latest
   ```

3. **Verify Health**
   ```bash
   curl https://your-domain.com/api/health
   ```

## Maintenance Tasks

### Daily
- Monitor health endpoint
- Review error logs
- Check rate limit usage

### Weekly
- Review audit logs
- Check storage usage
- Monitor subscription status
- Backup verification

### Monthly
- Update dependencies
- Security audit
- Performance review
- Archive old audit logs
- Test backup restore

## Support

For issues or questions:
- GitHub Issues: [Repository URL]
- Documentation: [Docs URL]
- Email: support@nextcrm.io

---

**Last Updated**: 2025-11-03
**Version**: 1.0.0
