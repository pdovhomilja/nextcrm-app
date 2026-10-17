-- Lead sources for the two AI assistants, so their leads stop being filed as "Web"
-- (website chat) and "Other" (phone) — or with no source at all where those rows
-- were missing. Names must match LEAD_SOURCE_BY_CHANNEL in
-- lib/crm/assistant/record-inquiry.ts. Idempotent.

INSERT INTO "crm_Lead_Sources" ("name") VALUES
  ('AI Website Chat'),
  ('AI Phone Assistant')
ON CONFLICT ("name") DO NOTHING;

-- Backfill: re-tag only leads an assistant CREATED (crm_Assistant_Inquiries.leadCreated)
-- and that still carry the old generic source (Web / Other / none). A lead the assistant
-- merely matched keeps its source, and so does one an admin has already re-sourced.
UPDATE "crm_Leads" AS l
SET "lead_source_id" = s."id"
FROM "crm_Assistant_Inquiries" AS i
JOIN "crm_Lead_Sources" AS s
  ON s."name" = CASE i."source"
    WHEN 'website_chat' THEN 'AI Website Chat'
    WHEN 'voice_call' THEN 'AI Phone Assistant'
  END
WHERE i."leadId" = l."id"
  AND i."leadCreated" = true
  AND (
    l."lead_source_id" IS NULL
    OR l."lead_source_id" IN (SELECT "id" FROM "crm_Lead_Sources" WHERE "name" IN ('Web', 'Other'))
  );
