-- Remember the operator-selected (or first-run snapshotted) HOMEPAGE_STYLE prompt
-- per target, so the chosen homepage style is reused across generate/refine and
-- does not drift when the style library changes. No hard FK (mirrors
-- homepage_industry_prompt_id). Additive + nullable: safe, no backfill.
ALTER TABLE "crm_Targets" ADD COLUMN "homepage_style_prompt_id" UUID;
