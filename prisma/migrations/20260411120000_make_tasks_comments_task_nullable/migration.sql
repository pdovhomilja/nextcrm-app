-- Make `tasksComments.task` nullable so CRM account task comments (which
-- link via `assigned_crm_account_task` instead) can be inserted without
-- violating the FK constraint to the Projects `Tasks` table.
--
-- Additive change: existing NOT NULL rows remain valid. Safe under
-- concurrent writes because it only relaxes the constraint.
ALTER TABLE "tasksComments" ALTER COLUMN "task" DROP NOT NULL;
