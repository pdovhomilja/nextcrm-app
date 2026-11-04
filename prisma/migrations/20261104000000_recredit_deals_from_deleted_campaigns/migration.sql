-- Data fix, no schema change. Deals made with "Convert to deal" before 0.37.13
-- could be credited to a campaign that is now deleted (UI delete sets
-- status 'deleted', MCP delete sets deletedAt). Re-credit them with the rule
-- convertTargetToDeal uses since 0.37.13: the campaign of the target's newest
-- send (sent_at DESC, as Prisma orders it) whose campaign is not deleted, or
-- NULL when there is none.
--
-- Only live deals on a deleted campaign that match a converted target
-- (converted_contact_id = contact AND converted_account_id = account) change.
-- Deals entered by hand on a deleted campaign stay as they are. Running it
-- again changes nothing: no matching deal points at a deleted campaign anymore.
-- Not reversible except from a backup.
UPDATE "crm_Opportunities" AS o
SET "campaign" = (
  SELECT s."campaign_id"
  FROM "crm_campaign_sends" s
  JOIN "crm_Targets" t ON t."id" = s."target_id"
  JOIN "crm_campaigns" c ON c."id" = s."campaign_id"
  WHERE t."converted_contact_id" = o."contact"
    AND t."converted_account_id" = o."account"
    AND c."deletedAt" IS NULL
    AND (c."status" IS NULL OR c."status" <> 'deleted')
  ORDER BY s."sent_at" DESC
  LIMIT 1
)
FROM "crm_campaigns" dc
WHERE dc."id" = o."campaign"
  AND o."deletedAt" IS NULL
  AND (dc."status" = 'deleted' OR dc."deletedAt" IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM "crm_Targets" t
    WHERE t."converted_contact_id" = o."contact"
      AND t."converted_account_id" = o."account"
  );
