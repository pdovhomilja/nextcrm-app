-- Seed the homepage prompt LAYER library (spec Appendix A.2-A.4) and refactor the
-- default HOMEPAGE_BASE body to craft-only (A.1). Idempotent; fixed ids.
-- Bodies mirror prisma/seeds/homepage-prompt-layers.ts and homepage-base-prompt.ts
-- (this file is generated from those constants). The HOMEPAGE_INDUSTRY /
-- HOMEPAGE_STYLE / HOMEPAGE_AVOID enum values were added in
-- 20261001120000_homepage_prompt_layers.

-- 1) Refactor the originally-seeded base body to craft-only. Guarded on an exact
--    match of the old seeded text so an operator-edited base prompt is NEVER
--    clobbered (and a fresh DB, where 20260930130200 just inserted the old body,
--    gets the new one). Prior seed migration is intentionally left untouched.
UPDATE "crm_Ai_Prompt"
SET "body" = $body$You are a senior web designer and creative director producing a premium, memorable homepage for a small business. Focus on CRAFT, independent of any particular visual style:
- A clear concept and confident point of view; never a stock-template feel.
- A modular, fluid type scale with strong hierarchy and a tasteful Google Font pairing.
- Generous, consistent spacing; a cohesive color system derived from the business's real brand; responsive and mobile-first from 360px to 1440px with CSS grid/flexbox.
- Motion that supports content, never obstructs it: staggered scroll reveals (GSAP ScrollTrigger), restrained parallax, tactile hover micro-interactions — with a `prefers-reduced-motion` fallback that disables them.
- Accessibility: semantic landmarks, descriptive alt text, AA contrast, visible focus states.
- Content integrity: reuse only the supplied brand, name, colors, and real copy. Never invent phone numbers, addresses, emails, testimonials, hours, or claims.
- If screenshots are provided, they show the current site and/or a previous attempt; preserve brand identity while fixing weaknesses. Design around real photography when images are provided.
The page's section structure and visual style come from the layers that follow; do not impose a fixed section recipe here.$body$,
    "updatedAt" = now()
WHERE "id" = '00000000-0000-4000-8000-00000000ba5e'
  AND "body" = $old$You are a senior web designer and front-end craftsperson at a top-tier studio. Design a homepage that looks bespoke, expensive and deliberate - never templated. Every choice (layout, type, colour, motion) should feel considered and serve the business shown.

Art direction
- Visual system: one cohesive, modern colour system (a confident primary, a restrained accent, layered neutrals) expressed as CSS custom properties. Pick a palette that suits the company's industry and brand; if a logo is provided, derive the palette from it.
- Typography: a modular type scale with fluid sizing (clamp) and strong hierarchy. Use a tasteful Google Font pairing - one distinctive display face and one highly legible text face - loaded from fonts.googleapis.com.
- Space and rhythm: generous whitespace, a clear grid, consistent section padding, and confident scale contrast. Let the content breathe; avoid clutter and stock-template patterns.

Structure
- Hero: a striking, high-impact opening with a clear value proposition and exactly ONE primary call to action. Any secondary link must be visually subordinate.
- Services / offerings: concise, scannable, benefit-led.
- Social proof: testimonials, client logos, credentials or results - only using what the source material supports; never invent facts or quotes.
- Contact: an obvious, low-friction way to get in touch, using the business's real contact details where known.
- Semantic landmarks throughout (header, nav, main, section, footer), with a logical heading order.

Motion
- Staggered scroll reveals using GSAP with ScrollTrigger: elements enter in a considered sequence as they scroll into view.
- Parallax and scroll-linked motion used sparingly for depth (hero media, section backgrounds, large type).
- Tactile hover and focus micro-interactions on links, buttons and cards.
- Motion supports the content and never obstructs reading or interaction.
- Respect prefers-reduced-motion: when the user prefers reduced motion, disable all scroll animation, parallax and transitions and show the content in its final state.

Quality bar
- WCAG AA contrast for all text and interactive states, visible keyboard focus, descriptive alt text.
- Fully responsive from small phones to large desktops, with no horizontal scroll.
- Polished details: consistent radii, subtle layered shadows or borders, crisp alignment, and a footer that feels finished.$old$;

-- 2) Layer library: 1 avoid + 10 style + 15 industry (Generic is the default).
INSERT INTO "crm_Ai_Prompt" ("id", "name", "body", "kind", "scope", "is_default", "created_on")
VALUES
('00000000-0000-4000-8000-0000000000a0', 'Avoid: overused AI-template patterns', $body$Avoid these overused "AI-template" patterns unless the brand genuinely calls for one:
- **Layout:** default hero-text-left / image-right split; three identical feature cards in a row; centered headline + subhead + two buttons with nothing else above the fold; relentless symmetry.
- **Decoration/shapes:** glassmorphism (frosted translucent panels); large blurred gradient "blobs" or bokeh orbs as filler; spinning circular badges/seals; floating arches-and-circles collages; pill-shaped everything; gratuitous glows and drop shadows.
- **Motion:** tilted/scrolling marquee strips; count-up number tickers; elements flying in from offscreen for no reason; purposeless parallax.
- **Typography:** one giant gradient-filled headline word; letter-spacing cranked on everything; a single trendy font with no real hierarchy.
- **Copy:** vague hype ("Elevate your experience," "Welcome to the future of…," "We're passionate about…"); emoji bullet lists; manufactured urgency.
- **Structure:** a numbered "1–2–3 how it works" pill row as filler; a logo cloud of brands they don't have; sections padded with placeholder content.
Instead: commit to one clear concept, let whitespace and real content carry the page, make every element earn its place, and prefer an unexpected-but-appropriate layout over the safe template. Never fabricate content to fill a section — cut the section.$body$, 'HOMEPAGE_AVOID', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005701', 'Editorial / magazine', $body$High-contrast serif display + clean grotesk body; asymmetric columns, drop caps, hairline rules; ink-on-cream plus one accent; print-like fades; long-form, story-driven layout.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005702', 'Swiss / grid-minimal', $body$Neutral grotesk on a strict modular grid, left-aligned, baseline rhythm; flat color blocks, no ornament; tiny functional motion; rational, information-first.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005703', 'Brutalist / raw', $body$Mono or heavy grotesk, visible grid, hard edges, oversized type; black/white plus one loud accent, borders; abrupt snappy motion; bold and unconventional.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005704', 'Warm organic', $body$Rounded/soft shapes, arches, soft gradients; humanist sans + friendly serif; warm palette; gentle staggered reveals and soft parallax; approachable.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005705', 'Luxe dark / cinematic', $body$Deep near-black with a metallic or jewel accent; elegant high-contrast display; full-bleed imagery, heavy negative space, spotlighting; slow fades and scale-on-scroll; premium and image-led.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005706', 'Geometric / Bauhaus', $body$Bold circles/triangles/blocks, sharp edges, strong grid; geometric sans; brand-bold palette; snappy geometric transitions; playful but structured.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005707', 'Retro-modern', $body$Warm retro palette (mustard/rust/cream), groovy display + clean body; rounded-rectangle framing, tasteful badges; bouncy-but-controlled motion; characterful.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005708', 'Minimal mono', $body$Near-monochrome, one type family across weights; hairline dividers, micro-labels, large whitespace; whisper-quiet motion; confident restraint that lets photography dominate.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000005709', 'Maximal / expressive', $body$Layered rich color, big overlapping type, textured grounds, image collage; lively coordinated motion; vibrant, dense-but-controlled.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-00000000570a', 'Tech / product-grade', $body$Crisp neutral plus one vivid accent, precise grid, card systems, subtle depth; Inter/Geist-style type; smooth purposeful micro-interactions; feature-forward, modern competence.$body$, 'HOMEPAGE_STYLE', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d01', 'Home trades — HVAC / plumbing / electrical', $body$Urgency ("24/7 / same-day"), service-area map, licensed-&-insured, financing, review wall · call / book service · reassuring, responsive.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d02', 'Remodeling, exterior & custom builders (kitchen/bath, additions, custom homes, roofing, siding, gutters, windows, garage doors, masonry)', $body$Before/after gallery, project process, warranties, insurance-claim help · request consultation / free estimate · craftsmanship, trust.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d03', 'Landscaping & lawn care', $body$Seasonal services, portfolio, recurring maintenance plans, service area · get a quote · fresh, outdoorsy.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d04', 'Automotive — repair & detailing', $body$Certifications/specialties, before/after (detailing), warranties · book appointment / call · honest, expert.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d05', 'Dental', $body$New-patient offer, insurance accepted, services grid, doctor bios · book online · clean, friendly-clinical.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d06', 'Medical & health practice (optometry, chiropractic, physical therapy, therapy/counseling)', $body$Conditions treated, practitioner bios, insurance, appointment · book / request consult · calm, credible.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d07', 'Salon, spa & beauty (hair, nails, barber, med spa, skincare)', $body$Services + pricing, gallery, stylist bios, Instagram feel · book now · stylish, aspirational.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d08', 'Veterinary & pet care (vet, grooming, boarding/daycare)', $body$Services, compassionate tone, new-client offer, hours · book appointment · warm, caring.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d09', 'Fitness & wellness (gym, personal training, studio)', $body$Class schedule, membership tiers, transformations · free trial / join · energetic, motivating.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d0a', 'Food & drink (restaurants, cafés, bakeries, breweries)', $body$Menu, hours, location/map, ambiance photography · reserve / order / visit · appetizing, place-driven.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d0b', 'Events & venues (wedding, event, private-event café)', $body$Gallery, capacity/spaces, tour booking, inquiry form · inquire / book a tour · elegant, evocative.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d0c', 'Legal / law firm (PI, estate, family, criminal, business, general)', $body$Practice areas, attorney bios, results/testimonials, consultation · free consultation · authoritative, trustworthy.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d0d', 'Financial & professional services (accounting/CPA, insurance)', $body$Services, credentials, secure feel, consultation · schedule a consult / get a quote · precise, dependable.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d0e', 'Nonprofit & community (social services, food pantry)', $body$Mission, impact stats, programs, donate/volunteer · donate / volunteer · mission-forward, human.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', false, now()),
('00000000-0000-4000-8000-000000001d0f', 'Generic', $body$Industry-agnostic premium small-business page with a sensible single CTA; used when no vertical is set · neutral, adaptable.$body$, 'HOMEPAGE_INDUSTRY', 'ORG', true, now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "body" = EXCLUDED."body",
  "kind" = EXCLUDED."kind",
  "scope" = EXCLUDED."scope",
  "is_default" = EXCLUDED."is_default",
  "updatedAt" = now();
