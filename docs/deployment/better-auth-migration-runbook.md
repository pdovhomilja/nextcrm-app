# Better-Auth Migration Runbook

## Pre-Migration Checklist
- [ ] Announce maintenance window to users (minimum 1 hour notice)
- [ ] Verify `BETTER_AUTH_SECRET` generated: `openssl rand -base64 32`
- [ ] Verify `BETTER_AUTH_URL` set to instance URL
- [ ] Verify `GOOGLE_ID` and `GOOGLE_SECRET` configured
- [ ] Verify `RESEND_API_KEY` and `EMAIL_FROM` configured
- [ ] Remove `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`
- [ ] Database backup taken

## Migration Steps
1. Enable maintenance mode
2. Deploy new code
3. Run database migration: `npx prisma migrate deploy`
4. Run role backfill: `npx tsx scripts/migration/backfill-roles.ts`
5. Verify: `curl -I https://<instance>/api/auth/ok` (should return 200)
6. Disable maintenance mode
7. Test sign-in flow manually

## Rollback Procedure
1. Enable maintenance mode
2. Revert to previous code deploy
3. Old auth columns (`password`, `is_admin`, `is_account_admin`) are intact
4. New tables (`session`, `account`, `verification`) are harmless
5. Disable maintenance mode
6. Users log in with old credentials

## Post-Migration Verification
- [ ] Admin can sign in via Google
- [ ] Non-admin can sign in via Email OTP
- [ ] PENDING flow works (new user → pending → admin approves → active)
- [ ] Sign-out invalidates session
- [ ] Protected routes redirect unauthenticated users
- [ ] Admin panel shows role dropdown

## Instance Rollout Order
1. Lowest-risk instance first
2. Monitor for 24-48 hours
3. Proceed to next instance
4. After all instances stable: schedule cleanup PR
