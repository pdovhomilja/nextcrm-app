-- Add one HOMEPAGE_STYLE art-direction card: "Heritage / aspirational serif".
-- Idempotent; fixed id (style NN = 0c, next in spec order after 0b). Body mirrors
-- prisma/seeds/homepage-prompt-layers.ts (STYLES). ON CONFLICT DO UPDATE so a fresh
-- DB gets it and an operator-edited row with this id is reset to the code body,
-- consistent with 20261001130000_seed_homepage_prompt_layers.

INSERT INTO "crm_Ai_Prompt" ("id", "name", "body", "kind", "scope", "is_default", "created_on")
VALUES
('00000000-0000-4000-8000-00000000570c', 'Heritage / aspirational serif', $body$Elegant high-contrast serif display (Playfair-style) title-case headlines, a tall condensed uppercase sans for hero labels, and a clean grotesk body; refined, lightly-rounded cards and buttons on a structured grid with a subtle geometric line texture; light warm base, one deep traditional brand primary, and a sparing metallic accent (eyebrows, hairlines, icons, photo frames); full-bleed full-color lifestyle photography with centered caps labels, image-led and aspirational; gentle motion — soft scroll reveals, hover lifts; warm, refined, established, trustworthy.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "body" = EXCLUDED."body",
  "kind" = EXCLUDED."kind",
  "scope" = EXCLUDED."scope",
  "is_default" = EXCLUDED."is_default",
  "updatedAt" = now();
