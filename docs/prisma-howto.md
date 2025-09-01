# Prisma Schema Development Workflow

This guide outlines the safe workflow for managing Prisma schema changes across development and production environments in TaskHQ.

## Overview

Our database setup:

- **Development**: `taskhq-xmation-dev` (local development database)
- **Production**: `taskhq-xmation` (production database)
- **Workflow**: Local dev � Test � Git � Production deployment

## 1\. Local Development (db_dev)

### Making Schema Changes

```bash
# 1. Edit your prisma/schema.prisma file
# 2. Generate migration for dev database
pnpm prisma migrate dev --name descriptive_migration_name

# 3. This automatically:
#    - Creates migration files in prisma/migrations/
#    - Applies migration to db_dev
#    - Regenerates Prisma client
```

### Example Migration Names

```bash
pnpm prisma migrate dev --name add_smtp_user_password
pnpm prisma migrate dev --name update_user_email_verification
pnpm prisma migrate dev --name create_audit_log_table
```

## 2\. Testing & Validation

```bash
# Test your changes thoroughly
pnpm dev  # Start development server
pnpm test # Run your test suite

# Verify migration status
pnpm prisma migrate status

# Regenerate client if needed
pnpm prisma generate
```

## 3\. Code Review & Git Workflow

```bash
# Commit schema + migration files together (NEVER separate them)
git add prisma/schema.prisma
git add prisma/migrations/

# Commit with descriptive message
git commit -m "feat: add smtpUser and smtpPassword to UserMailAccount"

# Push to feature branch for review
git push origin feature/add-smtp-fields

# After code review approval, merge to main
```

## 4\. Production Deployment

### Option A: Manual Production Deployment (Safe)

```bash
# 1. Switch to production environment
export DATABASE_URL="your_production_db_url"

# 2. ALWAYS backup first! (CRITICAL)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Deploy migrations (safe - only applies pending migrations)
pnpm prisma migrate deploy

# 4. Verify deployment success
pnpm prisma migrate status

# 5. Generate production client
pnpm prisma generate
```

### Option B: CI/CD Pipeline (Recommended)

```yaml
# Example GitHub Actions workflow
deploy:
  steps:
    - name: Backup Production Database
      run: |
        pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
        # Upload backup to secure storage

    - name: Deploy Prisma Migrations
      run: pnpm prisma migrate deploy
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }}

    - name: Verify Migration Status
      run: pnpm prisma migrate status
```

## 5\. Environment Configuration

### Separate Environment Files

**.env.development**

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/taskhq_dev"
NODE_ENV="development"
```

**.env.production**

```env
DATABASE_URL="postgresql://user:pass@prod-host:5432/taskhq_prod"
NODE_ENV="production"
```

### Using Environment-Specific Configs

```bash
# Development
export NODE_ENV=development
source .env.development

# Production
export NODE_ENV=production
source .env.production
```

## 6\. Command Reference

| Command                 | Purpose                       | Environment      | Safety Level      |
| ----------------------- | ----------------------------- | ---------------- | ----------------- |
| `prisma migrate dev`    | Create + apply migration      | Development only | � Dev only        |
| `prisma migrate deploy` | Apply pending migrations      | Production safe  |  Safe             |
| `prisma migrate status` | Check migration state         | Any              |  Safe             |
| `prisma generate`       | Generate Prisma client        | Any              |  Safe             |
| `prisma db push`        | Skip migrations (schema sync) | Prototyping only | � Skip migrations |
| `prisma migrate reset`  | Reset DB + delete all data    | Development only | L Destructive     |
| `prisma db seed`        | Run database seeds            | Any              |  Safe             |

## 7\. Best Practices

###  DO:

- **Always backup production** before any migration
- **Test migrations thoroughly** on development/staging first
- **Use descriptive migration names** that explain the change
- **Commit schema and migrations together** in the same commit
- **Use** `migrate deploy` for all production deployments
- **Review migration SQL** before applying to production
- **Have a rollback plan** ready before deployment

### L DON'T:

- **Never use** `migrate dev` in production environments
- **Never use** `db push` in production (skips migration history)
- **Never skip testing** migrations in development first
- **Never edit migration files** after they're created
- **Never deploy without backups** of production data
- **Never commit schema changes** without corresponding migrations

## 8\. Troubleshooting

### Shadow Database Issues

If you encounter shadow database errors like in today's case:

```bash
# Create migration manually when shadow DB fails
mkdir -p "prisma/migrations/$(date +%Y%m%d%H%M%S)_descriptive_name"

# Create migration.sql with your changes
cat > prisma/migrations/TIMESTAMP_name/migration.sql << EOF
-- AlterTable
ALTER TABLE "table_name" ADD COLUMN "new_field" TEXT;
EOF

# Apply manually
pnpm prisma migrate deploy
pnpm prisma generate
```

### Emergency Rollback Procedures

#### Method 1: Database Restore

```bash
# Restore from backup (complete rollback)
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

#### Method 2: Migration Rollback

```bash
# Mark problematic migration as rolled back
pnpm prisma migrate resolve --rolled-back MIGRATION_NAME

# Then create a new migration to undo changes
pnpm prisma migrate dev --name rollback_previous_changes
```

## 9\. Migration File Structure

```
prisma/
�� schema.prisma              # Your database schema
�� migrations/
   �� migration_lock.toml    # Lock file for migration ordering
   �� 20240830103253_init/
      �� migration.sql      # Initial database setup
   �� 20240830114051_add_user_mail_account/
      �� migration.sql      # Add user mail accounts
   �� 20240901134835_add_smtp_fields/
       �� migration.sql      # Add SMTP configuration fields
```

## 10\. Safety Checklist

Before any production migration:

- [ ]  Backup created and verified

- [ ]  Migration tested in development

- [ ]  Migration tested in staging (if available)

- [ ]  Code review completed

- [ ]  Rollback plan prepared

- [ ]  Team notified of deployment window

- [ ]  Monitoring ready to detect issues

- [ ]  `migrate deploy` command ready (not `migrate dev`)

## 11\. Common Migration Patterns

### Adding New Columns (Safe)

```sql
-- Always safe - adds nullable column
ALTER TABLE "users" ADD COLUMN "new_field" TEXT;

-- Safe with default - adds non-nullable column with default
ALTER TABLE "users" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
```

### Adding New Tables (Always Safe)

```sql
CREATE TABLE "new_feature" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP DEFAULT NOW()
);
```

### Renaming Columns (Requires Care)

```sql
-- Step 1: Add new column
ALTER TABLE "users" ADD COLUMN "full_name" TEXT;

-- Step 2: Migrate data (in application code or separate script)
UPDATE "users" SET "full_name" = "name";

-- Step 3: Drop old column (separate migration)
ALTER TABLE "users" DROP COLUMN "name";
```

### Adding Indexes (Use CONCURRENTLY)

```sql
-- Safe - doesn't lock table
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users"("email");

-- Unsafe - locks table during creation
CREATE INDEX "idx_users_email" ON "users"("email");
```

Remember: **Data safety is always the top priority. When in doubt, choose the most conservative approach.**
