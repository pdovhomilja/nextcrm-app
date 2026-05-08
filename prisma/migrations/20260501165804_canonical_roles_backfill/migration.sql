-- Canonical role backfill (phase A, no schema change).
-- Map legacy values:
--   admin  -> admin
--   member -> manager
--   viewer -> user
--   anything else (incl. NULL) -> user

UPDATE "Users"
SET "role" = CASE
  WHEN "role" = 'admin'  THEN 'admin'
  WHEN "role" = 'member' THEN 'manager'
  WHEN "role" = 'viewer' THEN 'user'
  WHEN "role" IN ('user','manager') THEN "role"
  ELSE 'user'
END;

-- Keep is_admin in sync with role for the migration window.
UPDATE "Users"
SET "is_admin" = ("role" = 'admin');
