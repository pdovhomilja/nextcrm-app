# Phase 6: Deployment Plan

## 1. Objective

The objective of this phase is to safely deploy the new multi-tenant application to production with minimal downtime and zero data loss. This involves a carefully sequenced plan that includes pre-deployment checks, a scheduled maintenance window, and post-deployment monitoring.

## 2. Pre-Deployment Strategy

### 2.1. Staging Environment Deployment (Mandatory)

**Goal**: Create a full dress rehearsal of the production deployment process on a staging environment that is a 1-to-1 mirror of production.

**Steps:**

1.  **Provision Staging DB**: Create a staging database and populate it with a recent, anonymized snapshot of the production database.
2.  **Deploy Code**: Deploy the new multi-tenant application code to the staging environment.
3.  **Run Migration Script**: Execute the full data migration process (Phase 2) on the staging database.
    - `pnpm prisma migrate dev ...`
    - Run the `migrate-to-multitenancy.ts` script.
    - `pnpm prisma migrate dev ...` (for making `companyId` non-nullable).
4.  **Thorough QA**: Perform the complete testing suite from Phase 5 on the staging environment. This is the final quality gate before production.
5.  **Practice Rollback**: Practice a rollback procedure on the staging environment. This involves restoring the database from the pre-migration backup and redeploying the previous version of the application code.

### 2.2. Communication Plan

- **Internal**: Notify all internal stakeholders (support, marketing, etc.) of the upcoming maintenance window at least 48 hours in advance.
- **External**: Notify all users of the scheduled maintenance at least 24 hours in advance. This can be done via an in-app banner, email, or status page.

## 3. Production Deployment Execution

This process should be executed during a period of low user activity (e.g., late at night or on a weekend) to minimize user impact.

### Step 1: Take a Final Database Backup (CRITICAL)

- Before making **any** changes to the production environment, take a final, complete, and verified backup of the production database.
- **Verify the backup is restorable.**
- Store this backup securely. This is the most critical step for data protection.

### Step 2: Enable Maintenance Mode

- Activate a maintenance page for the application. This prevents users from accessing the app and making changes while the database migration is in progress. This can be done at the load balancer, CDN, or application level.

### Step 3: Run the Database Migration

- Connect to the production database with the necessary permissions.
- Execute the same, tested migration commands and scripts that were run on the staging environment.
  1.  `pnpm prisma migrate deploy` (Use `deploy` instead of `dev` in production for non-interactive application of migrations).
  2.  Execute the backfill script: `ts-node prisma/scripts/migrate-to-multitenancy.ts`.
  3.  Run the final migration to make the `companyId` non-nullable.
- **Monitor Closely**: Watch the script's output for any errors. If any step fails, halt the process immediately and proceed to the rollback plan.

### Step 4: Deploy the New Application Code

- Once the database migration is confirmed as successful, deploy the new version of the TaskHQ application code to the production servers.

### Step 5: Perform a Sanity Check

- Before disabling maintenance mode, have a small team of engineers perform a quick sanity check on the live application.
  - Can you log in?
  - Is the company switcher visible?
  - Can you view and interact with boards and tasks?
  - Can you switch companies?

### Step 6: Disable Maintenance Mode

- Once the sanity check passes, disable the maintenance page and allow user traffic to access the new version of the application.

## 4. Post-Deployment Monitoring

**Goal**: Actively monitor the application for any unexpected issues or performance degradation.

- **Error Tracking**: Keep a close watch on error tracking services (e.g., Sentry, LogRocket) for any new or unusual exceptions.
- **Performance Metrics**: Monitor application performance monitoring (APM) tools (e.g., Vercel Analytics, Datadog) for database query performance, API response times, and web vitals. Pay close attention to queries involving the new `companyId` joins.
- **User Feedback**: Monitor support channels for any user-reported issues related to data visibility or access.

## 5. Rollback Plan

If a critical issue is discovered during the migration or immediately after deployment that cannot be fixed quickly, initiate the rollback plan.

1.  **Re-enable Maintenance Mode**.
2.  **Restore the Database**: Restore the production database from the backup taken in Step 1.
3.  **Redeploy Previous Code**: Roll back the application code to the last stable version before the multi-tenancy deployment.
4.  **Verify**: Perform a sanity check to ensure the application is back to its pre-deployment state.
5.  **Disable Maintenance Mode**.
6.  **Post-Mortem**: Conduct a thorough analysis to understand what went wrong before re-attempting the deployment.

## 6. Definition of Done

- The multi-tenant version of the application is successfully deployed to production.
- The data migration is complete and verified.
- Users can access and use the application without issues.
- Post-deployment monitoring shows no critical errors or performance regressions.
