-- Phase F (Task 4): drop legacy admin flags from Users.
--
-- Both columns were superseded by Users.role (now an AppRole enum). All
-- runtime authorization decisions go through lib/authz, which reads role
-- exclusively. Pre-flight check ran in Phase F Task 2 / Task 1: no code
-- still reads either column at runtime.

-- Drop the indexes Prisma created on these columns first.
DROP INDEX IF EXISTS "Users_is_admin_idx";
DROP INDEX IF EXISTS "Users_is_account_admin_idx";

-- Drop the columns themselves.
ALTER TABLE "Users" DROP COLUMN IF EXISTS "is_admin";
ALTER TABLE "Users" DROP COLUMN IF EXISTS "is_account_admin";

-- Add a role index to replace the role-based filters that previously used is_admin.
CREATE INDEX IF NOT EXISTS "Users_role_idx" ON "Users"("role");
