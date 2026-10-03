-- Add one HOMEPAGE_STYLE art-direction card: "Corporate trust / institutional".
-- Idempotent; fixed id (style NN = 0b, next in spec order after 0a). Body mirrors
-- prisma/seeds/homepage-prompt-layers.ts (STYLES). ON CONFLICT DO UPDATE so a fresh
-- DB gets it and an operator-edited row with this id is reset to the code body,
-- consistent with 20261001130000_seed_homepage_prompt_layers.

INSERT INTO "crm_Ai_Prompt" ("id", "name", "body", "kind", "scope", "is_default", "created_on")
VALUES
('00000000-0000-4000-8000-00000000570b', 'Corporate trust / institutional', $body$Geometric grotesk (Geist/Inter-style) sentence-case headlines with tight tracking, paired with an uppercase letter-spaced monospace for eyebrows and micro-labels; generously rounded cards, pill buttons and filter chips on a precise grid with ample whitespace; warm off-white base, one deep authoritative brand primary and a soft, muted secondary tint, with sparing semantic status pills (success-green / caution-amber); full-bleed photographic heroes under a brand related color duotone/gradient wash, image-led throughout; calm, purposeful motion — staggered scroll reveals, gentle hover lifts; trustworthy, modern-institutional, enterprise/government-grade.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "body" = EXCLUDED."body",
  "kind" = EXCLUDED."kind",
  "scope" = EXCLUDED."scope",
  "is_default" = EXCLUDED."is_default",
  "updatedAt" = now();
