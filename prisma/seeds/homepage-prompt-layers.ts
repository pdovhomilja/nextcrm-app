import type { PrismaClient } from "@prisma/client";

/**
 * Starter library of homepage prompt LAYERS (spec Appendix A.2-A.4):
 *   - 1 HOMEPAGE_AVOID  (always applied),
 *   - 10 HOMEPAGE_STYLE (art-direction cards, stable-per-target pick),
 *   - 15 HOMEPAGE_INDUSTRY (vertical cards; "Generic" is the default).
 * The refactored craft-only HOMEPAGE_BASE body lives in homepage-base-prompt.ts.
 *
 * Every row has a FIXED UUID so upsert-by-id is idempotent and can never touch
 * operator-created prompts (which get random ids). The SAME ids + bodies are
 * inserted (ON CONFLICT (id) DO UPDATE) by migration
 * 20261001130000_seed_homepage_prompt_layers so hosted environments get the
 * rows on deploy without running a seed script. Keep the two in sync if a body
 * is ever edited (the migration SQL is generated from these constants).
 *
 * ID scheme (UUIDv4-shaped, last 12 hex digits carry the meaning):
 *   avoid    00000000-0000-4000-8000-0000000000a0
 *   style    00000000-0000-4000-8000-0000000057NN   (NN = 01..0a, spec order)
 *   industry 00000000-0000-4000-8000-000000001dNN   (NN = 01..0f, spec order)
 * (HOMEPAGE_BASE keeps 00000000-0000-4000-8000-00000000ba5e.)
 *
 * These are content, not code: operators edit them in the UI. Re-running the
 * seed resets the seeded rows to the code bodies (same as the base prompt).
 */
export type PromptLayerKind = "HOMEPAGE_AVOID" | "HOMEPAGE_STYLE" | "HOMEPAGE_INDUSTRY";

export interface PromptLayerSeed {
  id: string;
  name: string;
  body: string;
  kind: PromptLayerKind;
  is_default?: boolean;
}

const ID_PREFIX = "00000000-0000-4000-8000-";
const hex2 = (n: number) => n.toString(16).padStart(2, "0");

export const AVOID_PROMPT: PromptLayerSeed = {
  id: `${ID_PREFIX}0000000000a0`,
  name: "Avoid: overused AI-template patterns",
  kind: "HOMEPAGE_AVOID",
  body: `Avoid these overused "AI-template" patterns unless the brand genuinely calls for one:
- **Layout:** default hero-text-left / image-right split; three identical feature cards in a row; centered headline + subhead + two buttons with nothing else above the fold; relentless symmetry.
- **Decoration/shapes:** glassmorphism (frosted translucent panels); large blurred gradient "blobs" or bokeh orbs as filler; spinning circular badges/seals; floating arches-and-circles collages; pill-shaped everything; gratuitous glows and drop shadows.
- **Motion:** tilted/scrolling marquee strips; count-up number tickers; elements flying in from offscreen for no reason; purposeless parallax.
- **Typography:** one giant gradient-filled headline word; letter-spacing cranked on everything; a single trendy font with no real hierarchy.
- **Copy:** vague hype ("Elevate your experience," "Welcome to the future of…," "We're passionate about…"); emoji bullet lists; manufactured urgency.
- **Structure:** a numbered "1–2–3 how it works" pill row as filler; a logo cloud of brands they don't have; sections padded with placeholder content.
Instead: commit to one clear concept, let whitespace and real content carry the page, make every element earn its place, and prefer an unexpected-but-appropriate layout over the safe template. Never fabricate content to fill a section — cut the section.`,
};

const STYLES: Array<[string, string]> = [
  [
    "Editorial / magazine",
    "High-contrast serif display + clean grotesk body; asymmetric columns, drop caps, hairline rules; ink-on-cream plus one accent; print-like fades; long-form, story-driven layout.",
  ],
  [
    "Swiss / grid-minimal",
    "Neutral grotesk on a strict modular grid, left-aligned, baseline rhythm; flat color blocks, no ornament; tiny functional motion; rational, information-first.",
  ],
  [
    "Brutalist / raw",
    "Mono or heavy grotesk, visible grid, hard edges, oversized type; black/white plus one loud accent, borders; abrupt snappy motion; bold and unconventional.",
  ],
  [
    "Warm organic",
    "Rounded/soft shapes, arches, soft gradients; humanist sans + friendly serif; warm palette; gentle staggered reveals and soft parallax; approachable.",
  ],
  [
    "Luxe dark / cinematic",
    "Deep near-black with a metallic or jewel accent; elegant high-contrast display; full-bleed imagery, heavy negative space, spotlighting; slow fades and scale-on-scroll; premium and image-led.",
  ],
  [
    "Geometric / Bauhaus",
    "Bold circles/triangles/blocks, sharp edges, strong grid; geometric sans; brand-bold palette; snappy geometric transitions; playful but structured.",
  ],
  [
    "Retro-modern",
    "Warm retro palette (mustard/rust/cream), groovy display + clean body; rounded-rectangle framing, tasteful badges; bouncy-but-controlled motion; characterful.",
  ],
  [
    "Minimal mono",
    "Near-monochrome, one type family across weights; hairline dividers, micro-labels, large whitespace; whisper-quiet motion; confident restraint that lets photography dominate.",
  ],
  [
    "Maximal / expressive",
    "Layered rich color, big overlapping type, textured grounds, image collage; lively coordinated motion; vibrant, dense-but-controlled.",
  ],
  [
    "Tech / product-grade",
    "Crisp neutral plus one vivid accent, precise grid, card systems, subtle depth; Inter/Geist-style type; smooth purposeful micro-interactions; feature-forward, modern competence.",
  ],
];

export const STYLE_PROMPTS: PromptLayerSeed[] = STYLES.map(([name, body], i) => ({
  id: `${ID_PREFIX}0000000057${hex2(i + 1)}`,
  name,
  body,
  kind: "HOMEPAGE_STYLE" as const,
}));

// Format per card: signature sections · trust signals · primary conversion · tone.
const INDUSTRIES: Array<[string, string]> = [
  [
    "Home trades — HVAC / plumbing / electrical",
    'Urgency ("24/7 / same-day"), service-area map, licensed-&-insured, financing, review wall · call / book service · reassuring, responsive.',
  ],
  [
    "Remodeling, exterior & custom builders (kitchen/bath, additions, custom homes, roofing, siding, gutters, windows, garage doors, masonry)",
    "Before/after gallery, project process, warranties, insurance-claim help · request consultation / free estimate · craftsmanship, trust.",
  ],
  [
    "Landscaping & lawn care",
    "Seasonal services, portfolio, recurring maintenance plans, service area · get a quote · fresh, outdoorsy.",
  ],
  [
    "Automotive — repair & detailing",
    "Certifications/specialties, before/after (detailing), warranties · book appointment / call · honest, expert.",
  ],
  [
    "Dental",
    "New-patient offer, insurance accepted, services grid, doctor bios · book online · clean, friendly-clinical.",
  ],
  [
    "Medical & health practice (optometry, chiropractic, physical therapy, therapy/counseling)",
    "Conditions treated, practitioner bios, insurance, appointment · book / request consult · calm, credible.",
  ],
  [
    "Salon, spa & beauty (hair, nails, barber, med spa, skincare)",
    "Services + pricing, gallery, stylist bios, Instagram feel · book now · stylish, aspirational.",
  ],
  [
    "Veterinary & pet care (vet, grooming, boarding/daycare)",
    "Services, compassionate tone, new-client offer, hours · book appointment · warm, caring.",
  ],
  [
    "Fitness & wellness (gym, personal training, studio)",
    "Class schedule, membership tiers, transformations · free trial / join · energetic, motivating.",
  ],
  [
    "Food & drink (restaurants, cafés, bakeries, breweries)",
    "Menu, hours, location/map, ambiance photography · reserve / order / visit · appetizing, place-driven.",
  ],
  [
    "Events & venues (wedding, event, private-event café)",
    "Gallery, capacity/spaces, tour booking, inquiry form · inquire / book a tour · elegant, evocative.",
  ],
  [
    "Legal / law firm (PI, estate, family, criminal, business, general)",
    "Practice areas, attorney bios, results/testimonials, consultation · free consultation · authoritative, trustworthy.",
  ],
  [
    "Financial & professional services (accounting/CPA, insurance)",
    "Services, credentials, secure feel, consultation · schedule a consult / get a quote · precise, dependable.",
  ],
  [
    "Nonprofit & community (social services, food pantry)",
    "Mission, impact stats, programs, donate/volunteer · donate / volunteer · mission-forward, human.",
  ],
  [
    "Generic",
    "Industry-agnostic premium small-business page with a sensible single CTA; used when no vertical is set · neutral, adaptable.",
  ],
];

export const INDUSTRY_PROMPTS: PromptLayerSeed[] = INDUSTRIES.map(([name, body], i) => ({
  id: `${ID_PREFIX}000000001d${hex2(i + 1)}`,
  name,
  body,
  kind: "HOMEPAGE_INDUSTRY" as const,
  is_default: name === "Generic",
}));

/** Every layer row this module seeds (avoid + styles + industries). */
export const ALL_LAYER_PROMPTS: PromptLayerSeed[] = [
  AVOID_PROMPT,
  ...STYLE_PROMPTS,
  ...INDUSTRY_PROMPTS,
];

/**
 * Idempotent: safe to re-run. Upserts by fixed id, so it never duplicates and
 * never touches operator-created prompts. Re-running resets the seeded rows to
 * the code bodies.
 */
export async function seedHomepagePromptLayers(prisma: PrismaClient): Promise<void> {
  for (const p of ALL_LAYER_PROMPTS) {
    const is_default = p.is_default ?? false;
    await prisma.crm_Ai_Prompt.upsert({
      where: { id: p.id },
      update: { name: p.name, body: p.body, kind: p.kind, scope: "ORG", is_default },
      create: {
        id: p.id,
        name: p.name,
        body: p.body,
        kind: p.kind,
        scope: "ORG",
        is_default,
        created_by: null,
      },
    });
  }
}
