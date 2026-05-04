-- Phase F (Task 3): switch Users.role from String to AppRole enum.
--
-- Pre-flight: Phase A's canonical_roles_backfill migration normalized all
-- legacy roles (admin/member/viewer) into admin/manager/user. This migration
-- defends against any post-A drift before swapping the column type.

-- 1. Create the enum.
CREATE TYPE "AppRole" AS ENUM ('user', 'manager', 'admin');

-- 2. Defensive backfill: any rogue role value coerces to 'user'.
UPDATE "Users"
   SET "role" = 'user'
 WHERE "role" NOT IN ('user', 'manager', 'admin');

-- 3. Switch column type. Drop default, retype, restore default.
ALTER TABLE "Users"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "Users"
  ALTER COLUMN "role" TYPE "AppRole"
    USING "role"::"AppRole";

ALTER TABLE "Users"
  ALTER COLUMN "role" SET DEFAULT 'user';
