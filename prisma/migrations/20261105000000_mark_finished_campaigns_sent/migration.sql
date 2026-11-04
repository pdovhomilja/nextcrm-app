-- Data fix, no schema change. Before 0.37.17 nothing ever set a campaign to
-- 'sent', so finished campaigns stayed 'sending' (and could not be deleted).
-- Same rule as markCampaignSentIfStep0Done: a live 'sending' campaign is sent
-- once no step-0 send is still waiting. A queued send to a recipient who
-- unsubscribed or is globally suppressed (do_not_email) is not waiting; sent,
-- delivered, bounced and failed are finished. A 'sending' campaign with no
-- step-0 send at all (no recipients) is finished too.
-- sent_at = the newest step-0 send's sent_at, or now() when none was sent.
-- Paused, deleted (status 'deleted' or deletedAt set) and every other status
-- stay as they are. Running it again changes nothing: only 'sending' rows move.
UPDATE "crm_campaigns" AS c
SET "status" = 'sent',
    "sent_at" = COALESCE(
      (
        SELECT MAX(s."sent_at")
        FROM "crm_campaign_sends" s
        JOIN "crm_campaign_steps" st ON st."id" = s."step_id"
        WHERE s."campaign_id" = c."id" AND st."order" = 0
      ),
      now()
    )
WHERE c."status" = 'sending'
  AND c."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "crm_campaign_sends" s
    JOIN "crm_campaign_steps" st ON st."id" = s."step_id"
    JOIN "crm_Targets" t ON t."id" = s."target_id"
    WHERE s."campaign_id" = c."id"
      AND st."order" = 0
      AND s."status" = 'queued'
      AND s."unsubscribed_at" IS NULL
      AND t."do_not_email" = false
  );
