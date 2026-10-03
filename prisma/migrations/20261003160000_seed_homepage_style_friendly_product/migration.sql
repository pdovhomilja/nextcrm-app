-- Add one HOMEPAGE_STYLE art-direction card: "Friendly product / warm SaaS".
-- Idempotent; fixed id (style NN = 0f, next in spec order after 0e). Body mirrors
-- prisma/seeds/homepage-prompt-layers.ts (STYLES). ON CONFLICT DO UPDATE so a fresh
-- DB gets it and an operator-edited row with this id is reset to the code body,
-- consistent with 20261001130000_seed_homepage_prompt_layers.

INSERT INTO "crm_Ai_Prompt" ("id", "name", "body", "kind", "scope", "is_default", "created_on")
VALUES
('00000000-0000-4000-8000-00000000570f', 'Friendly product / warm SaaS', $body$Characterful Title-Case display sans (PP-Frama-style) with playful inline touches — a swapped-in icon, a hand-drawn underline — over a clean grotesk body (Inter-style); warm cream/off-white base, near-ink text, and a single bright brand accent used sparingly (buttons, underlines, highlights); generously rounded pill buttons and badges, soft white cards, dashed flow connectors and product-UI screenshots on a tidy grid; friendly micro-interactions, gentle scroll reveals; approachable, optimistic, human — complex-made-simple product marketing.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "body" = EXCLUDED."body",
  "kind" = EXCLUDED."kind",
  "scope" = EXCLUDED."scope",
  "is_default" = EXCLUDED."is_default",
  "updatedAt" = now();
