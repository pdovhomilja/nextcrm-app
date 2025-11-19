# Migration Instructions - Enterprise Infrastructure

## Quick Start Guide

This guide will help you migrate your NextCRM database to include the new enterprise infrastructure features.

## Prerequisites

- Node.js v18.17.0+
- Access to your MongoDB database
- Backup of current database (recommended)

## Step-by-Step Migration

### Step 1: Backup Current Database

**IMPORTANT**: Always backup before migration!

```bash
# If using MongoDB Atlas
# Backups are automatic, but verify in Atlas console

# If using self-hosted MongoDB
mongodump --uri="YOUR_DATABASE_URL" --out="./backup-$(date +%Y%m%d)"
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Generate Prisma Client

This generates the TypeScript types for the new models.

```bash
npx prisma generate
```

Expected output:
```
✔ Generated Prisma Client
```

### Step 4: Push Schema to Database

This creates the new collections and updates existing ones.

```bash
npx prisma db push
```

Expected output:
```
✔ Your database is now in sync with your Prisma schema
```

### Step 5: Verify Database Schema

```bash
npx prisma studio
```

This opens Prisma Studio where you can verify the new models:
- ✅ AuditLog
- ✅ UserSession
- ✅ DataExport

### Step 6: Test the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### Step 7: Verify Functionality

1. **Health Check**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Rate Limiting**
   - Log in to the application
   - Navigate to `/api/rate-limit`
   - Verify rate limit data is returned

3. **Security Headers**
   ```bash
   curl -I http://localhost:3000
   ```
   Verify security headers are present

## New Database Collections

After migration, you should see these new collections in MongoDB:

1. **AuditLog**
   - Stores audit trail of all actions
   - Indexed for efficient queries
   - Automatically populated when using audit logger

2. **UserSession**
   - Tracks user sessions (future use)
   - IP and device tracking
   - Session expiration support

3. **DataExport**
   - Tracks data export requests
   - Status management
   - Export history

## Modified Collections

### Organizations
Added field:
- `deleteScheduledAt`: DateTime? - For soft delete with retention

### Users
Added relations:
- `auditLogs`: Reference to audit logs
- `sessions`: Reference to user sessions
- `dataExports`: Reference to data exports

## Environment Variables

No new required environment variables for basic functionality.

Optional:
```env
# For Redis-based rate limiting (recommended for production)
REDIS_URL=redis://localhost:6379
```

## Rollback Procedure

If you need to rollback:

```bash
# Restore from backup
mongorestore --uri="YOUR_DATABASE_URL" ./backup-YYYYMMDD
```

## Verification Checklist

After migration, verify:

- [ ] Application starts without errors
- [ ] Health endpoint returns "healthy"
- [ ] Can log in successfully
- [ ] Rate limiting works (check `/api/rate-limit`)
- [ ] Security headers are present
- [ ] Database has new collections (AuditLog, UserSession, DataExport)
- [ ] Audit logging works (perform an action, check audit logs)

## Common Issues

### Issue 1: Prisma Generate Fails

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npm install @prisma/client
npx prisma generate
```

### Issue 2: Database Push Fails

**Error**: `Authentication failed`

**Solution**:
- Verify DATABASE_URL in .env
- Check database user permissions
- Ensure database is accessible

### Issue 3: Application Won't Start

**Error**: Various Prisma-related errors

**Solution**:
```bash
# Clear Prisma cache
rm -rf node_modules/.prisma
npx prisma generate
npm run build
```

## Production Migration

For production environments:

1. **Schedule Maintenance Window**
   - Notify users of scheduled downtime
   - 30-minute window recommended

2. **Create Full Backup**
   ```bash
   # MongoDB Atlas: Trigger manual backup
   # Self-hosted: mongodump
   ```

3. **Run Migration**
   ```bash
   npx prisma generate
   npx prisma db push --accept-data-loss
   ```

4. **Verify Health**
   ```bash
   curl https://your-domain.com/api/health
   ```

5. **Monitor Logs**
   - Check for errors
   - Verify audit logging
   - Monitor rate limiting

## Testing After Migration

### Manual Testing

1. **Authentication**
   - Log in
   - Log out
   - Check audit logs for LOGIN/LOGOUT entries

2. **Rate Limiting**
   - Make API requests
   - Check rate limit headers
   - Verify limits based on plan

3. **Data Export**
   - Navigate to settings
   - Request data export
   - Verify export completes

4. **Audit Logging**
   - Perform various actions
   - Check audit logs page
   - Filter and export logs

### Automated Testing

```bash
# Run test suite (if available)
npm test

# Check TypeScript compilation
npm run build
```

## Next Steps After Migration

1. **Configure Monitoring**
   - Set up health check monitoring
   - Configure error alerts
   - Monitor rate limiting

2. **Implement UI Pages**
   - Audit logs viewer
   - Data export page
   - Admin dashboard

3. **Configure Redis** (Optional)
   - For distributed rate limiting
   - Better performance at scale

4. **Security Review**
   - Verify security headers
   - Test rate limiting
   - Review audit logs

## Support

If you encounter issues:

1. Check logs: `npm run dev` (development) or application logs (production)
2. Review documentation: `docs/SAAS_INFRASTRUCTURE.md`
3. Verify environment variables
4. Check database connectivity

## Summary

This migration adds:
- ✅ Audit logging infrastructure
- ✅ Rate limiting system
- ✅ Security headers
- ✅ Data export capability
- ✅ Organization deletion with retention
- ✅ Health monitoring
- ✅ Admin dashboard

All new features are backward compatible and won't affect existing functionality.

---

**Estimated Migration Time**: 5-10 minutes
**Downtime Required**: None (for development), 5-10 minutes (for production)
**Risk Level**: Low (non-breaking changes)

**Last Updated**: November 3, 2025
