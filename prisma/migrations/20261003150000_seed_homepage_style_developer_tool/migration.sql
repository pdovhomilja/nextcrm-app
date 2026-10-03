-- Add one HOMEPAGE_STYLE art-direction card: "Developer-tool / technical".
-- Idempotent; fixed id (style NN = 0e, next in spec order after 0d). Body mirrors
-- prisma/seeds/homepage-prompt-layers.ts (STYLES). ON CONFLICT DO UPDATE so a fresh
-- DB gets it and an operator-edited row with this id is reset to the code body,
-- consistent with 20261001130000_seed_homepage_prompt_layers.

INSERT INTO "crm_Ai_Prompt" ("id", "name", "body", "kind", "scope", "is_default", "created_on")
VALUES
('00000000-0000-4000-8000-00000000570e', 'Developer-tool / technical', $body$Refined Swiss grotesque for UI and body, a monospace for micro-labels, terminal blocks and data readouts, and a large light-weight sentence-case display for headlines with tight tracking; alternating near-black and white sections unified by a single vivid brand accent; precise grid with card systems, code/terminal panels, benchmark bars and live-metric readouts, plus abstract 3D-gradient renders in place of photography; smooth purposeful motion — micro-interactions, an interactive hero, scroll-synced data; precise, performant, developer-grade, cutting-edge.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "body" = EXCLUDED."body",
  "kind" = EXCLUDED."kind",
  "scope" = EXCLUDED."scope",
  "is_default" = EXCLUDED."is_default",
  "updatedAt" = now();
