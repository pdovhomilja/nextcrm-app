// Best-effort mapping of a target's free-text `industry` onto a HOMEPAGE_INDUSTRY
// prompt (the "Industry" layer). Pure, never throws; the operator can always
// override via the drawer dropdown, and null falls back to Generic at read time
// (see loadIndustryBody).

type IndustryPrompt = { id: string; name: string };

// Keyword rules keyed by a pattern on the START of the PROMPT NAME (so they track
// the seeded library but not its ids; anchored because names list other verticals
// in parentheses). A keyword ending in "*" is a word-prefix match
// ("dent*" -> dentist, dental); otherwise it must match whole word(s).
const RULES: Array<{ name: RegExp; keywords: string[] }> = [
  {
    name: /^(home trades|hvac)/i,
    keywords: [
      "hvac", "plumb*", "electric*", "heating", "cooling", "air conditioning",
      "furnace", "handyman", "appliance repair",
    ],
  },
  {
    name: /^remodel/i,
    keywords: [
      "remodel*", "kitchen", "bath", "bathroom", "roof*", "siding", "gutter*",
      "window*", "garage door*", "mason*", "builder*", "construction",
      "contractor*", "general contractor", "deck*", "addition*",
    ],
  },
  {
    name: /^landscap/i,
    keywords: ["landscap*", "lawn*", "tree service", "tree care", "irrigation", "garden*", "snow removal"],
  },
  {
    name: /^automotive/i,
    keywords: [
      "auto", "automotive", "car", "mechanic*", "detailing", "tire*", "collision",
      "body shop", "oil change", "transmission", "garage",
    ],
  },
  { name: /^dental/i, keywords: ["dent*", "orthodont*", "oral surgeon*", "endodont*"] },
  {
    name: /^medical/i,
    keywords: [
      "medical", "health*", "optometr*", "optical", "chiropract*", "physical therapy",
      "physiotherap*", "therap*", "counsel*", "clinic", "physician*", "doctor*",
      "dermatolog*", "pediatric*",
    ],
  },
  {
    name: /^salon/i,
    keywords: [
      "salon*", "spa", "beauty", "hair*", "nail*", "barber*", "med spa", "medspa",
      "skincare", "skin care", "esthetic*", "aesthetic*", "lash*", "brow*", "makeup",
      "massage",
    ],
  },
  {
    name: /^veterinar/i,
    keywords: ["vet", "vets", "veterinar*", "pet", "pets", "grooming", "boarding", "daycare", "kennel*", "animal*"],
  },
  {
    name: /^fitness/i,
    keywords: ["fitness", "gym*", "personal train*", "trainer*", "yoga", "pilates", "crossfit", "wellness", "martial art*", "boxing"],
  },
  {
    name: /^food/i,
    keywords: [
      "restaurant*", "cafe*", "bakery", "bakeries", "brewery", "breweries", "bar",
      "pizz*", "coffee", "catering", "food", "diner", "bistro", "pub", "taproom",
    ],
  },
  {
    name: /^events/i,
    keywords: ["event*", "venue*", "wedding*", "banquet*", "reception hall"],
  },
  {
    name: /^legal/i,
    keywords: ["law", "legal", "attorney*", "lawyer*", "paralegal"],
  },
  {
    name: /^financial/i,
    keywords: [
      "accounting", "accountant*", "cpa", "insurance", "tax*", "bookkeep*",
      "financial", "wealth", "advisor*", "adviser*", "mortgage",
    ],
  },
  {
    name: /^nonprofit/i,
    keywords: [
      "nonprofit*", "non profit*", "charit*", "food pantry", "food bank", "church*",
      "ministr*", "foundation", "social service*", "community",
    ],
  },
];

// Words too generic to be evidence when we derive keywords from a prompt NAME
// (operator-added or renamed prompts that no RULE covers).
const STOPWORDS = new Set([
  "and", "the", "for", "with", "general", "services", "service", "home", "custom",
  "other", "business", "businesses", "small", "local", "generic", "industry",
]);

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hits(haystack: string, keywords: string[]): number {
  const padded = ` ${haystack} `;
  let n = 0;
  for (const raw of keywords) {
    const prefix = raw.endsWith("*");
    const kw = normalize(raw.replace(/\*$/, ""));
    if (!kw) continue;
    // Multi-word phrases are stronger evidence than a single word ("food pantry" > "food").
    if (padded.includes(` ${kw}${prefix ? "" : " "}`)) n += kw.split(" ").length;
  }
  return n;
}

function keywordsFor(name: string): string[] {
  const rule = RULES.find((r) => r.name.test(name));
  if (rule) return rule.keywords;
  // Unknown prompt: use its own distinctive name tokens (singularized, whole-word).
  return normalize(name)
    .split(" ")
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
    .flatMap((t) => (t.endsWith("s") ? [t, t.slice(0, -1)] : [t]));
}

/**
 * Returns the id of the best-matching industry prompt for `freeText`, or null
 * when nothing matches (the caller treats null as "Generic"). Highest keyword
 * hit count wins; ties go to the earlier prompt in `industryPrompts`. The
 * "Generic" prompt is never returned.
 */
export function matchIndustry(
  freeText: string | null,
  industryPrompts: IndustryPrompt[],
): string | null {
  try {
    if (typeof freeText !== "string" || !Array.isArray(industryPrompts)) return null;
    const text = normalize(freeText);
    if (!text) return null;

    let bestId: string | null = null;
    let bestScore = 0;
    for (const p of industryPrompts) {
      if (!p || typeof p.name !== "string" || typeof p.id !== "string") continue;
      if (/^\s*generic\b/i.test(p.name)) continue;
      const score = hits(text, keywordsFor(p.name));
      if (score > bestScore) {
        bestScore = score;
        bestId = p.id;
      }
    }
    return bestId;
  } catch {
    return null;
  }
}
