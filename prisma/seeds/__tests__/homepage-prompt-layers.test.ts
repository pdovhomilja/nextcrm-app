import {
  AVOID_PROMPT,
  STYLE_PROMPTS,
  INDUSTRY_PROMPTS,
  seedHomepagePromptLayers,
} from "../homepage-prompt-layers";
import { HOMEPAGE_BASE_PROMPT_BODY } from "../homepage-base-prompt";

function fakePrisma() {
  const store = new Map<string, any>();
  const prisma: any = {
    crm_Ai_Prompt: {
      upsert: async ({ where, create, update }: any) => {
        const existing = store.get(where.id);
        store.set(where.id, existing ? { ...existing, ...update } : { ...create });
      },
    },
  };
  return { store, prisma };
}

describe("seedHomepagePromptLayers", () => {
  it("is idempotent and flags exactly one Generic default", async () => {
    const { store, prisma } = fakePrisma();
    await seedHomepagePromptLayers(prisma);
    await seedHomepagePromptLayers(prisma); // re-run
    const rows = Array.from(store.values());
    expect(STYLE_PROMPTS).toHaveLength(15);
    expect(INDUSTRY_PROMPTS).toHaveLength(15);
    expect(rows).toHaveLength(1 + STYLE_PROMPTS.length + INDUSTRY_PROMPTS.length);
    expect(rows.filter((r) => r.kind === "HOMEPAGE_AVOID")).toHaveLength(1);
    expect(rows.filter((r) => r.kind === "HOMEPAGE_STYLE")).toHaveLength(15);
    expect(rows.filter((r) => r.kind === "HOMEPAGE_INDUSTRY")).toHaveLength(15);
    const defaults = rows.filter((r) => r.kind === "HOMEPAGE_INDUSTRY" && r.is_default);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe("Generic");
  });

  it("creates ORG-scoped system rows (created_by null)", async () => {
    const { store, prisma } = fakePrisma();
    await seedHomepagePromptLayers(prisma);
    for (const r of Array.from(store.values())) {
      expect(r.scope).toBe("ORG");
      expect(r.created_by).toBeNull();
    }
  });

  it("uses distinct, valid fixed UUIDs", () => {
    const ids = [AVOID_PROMPT, ...STYLE_PROMPTS, ...INDUSTRY_PROMPTS].map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it("carries spec Appendix A bodies verbatim (spot checks)", () => {
    expect(AVOID_PROMPT.body).toContain("glassmorphism (frosted translucent panels)");
    expect(AVOID_PROMPT.body).toContain("Never fabricate content to fill a section");
    expect(STYLE_PROMPTS[0].name).toBe("Editorial / magazine");
    expect(STYLE_PROMPTS[0].body).toContain("High-contrast serif display");
    expect(INDUSTRY_PROMPTS[0].body).toContain("service-area map");
  });

  it("base prompt is craft-only (no Structure section recipe)", () => {
    expect(HOMEPAGE_BASE_PROMPT_BODY).not.toMatch(/^Structure$/m);
    expect(HOMEPAGE_BASE_PROMPT_BODY).toContain("do not impose a fixed section recipe here");
  });
});
