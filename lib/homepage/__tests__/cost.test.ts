import {
  computePassCostUsd,
  summarizeHomepageCost,
  type VersionCostInput,
} from "@/lib/homepage/cost";

const gen = (over: Partial<VersionCostInput>): VersionCostInput => ({
  pass_kind: "AUTO",
  model: "claude-sonnet-5-5",
  created_at: new Date("2026-10-01T00:00:00Z"),
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  ...over,
});

describe("computePassCostUsd", () => {
  it("prices all four token buckets for a known model", () => {
    // sonnet-5-5: in 2.0, out 10.0, cacheRead 0.20, cacheWrite 2.50 per 1M
    const cost = computePassCostUsd(
      {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_read_tokens: 1_000_000,
        cache_creation_tokens: 1_000_000,
      },
      "claude-sonnet-5-5",
    );
    expect(cost).toBeCloseTo(2.0 + 10.0 + 0.2 + 2.5, 6);
  });

  it("treats missing/null token fields as 0 (never NaN)", () => {
    const cost = computePassCostUsd(
      { input_tokens: 1_000_000, output_tokens: null },
      "claude-sonnet-5-5",
    );
    expect(cost).toBeCloseTo(2.0, 6);
    expect(Number.isNaN(cost)).toBe(false);
  });

  it("returns 0 for an unknown or null model (no throw)", () => {
    expect(computePassCostUsd({ input_tokens: 9_999 }, "some-legacy-model")).toBe(0);
    expect(computePassCostUsd({ input_tokens: 9_999 }, null)).toBe(0);
  });
});

describe("summarizeHomepageCost", () => {
  it("counts only AUTO/HUMAN passes and sums their cost", () => {
    const s = summarizeHomepageCost([
      gen({ output_tokens: 1_000_000, created_at: new Date("2026-10-01") }),
      gen({ pass_kind: "HUMAN", output_tokens: 1_000_000, created_at: new Date("2026-10-02") }),
      gen({ pass_kind: "UPLOAD", output_tokens: 1_000_000, created_at: new Date("2026-10-03") }),
    ]);
    expect(s.generations).toBe(2);
    expect(s.totalCostUsd).toBeCloseTo(20.0, 6); // 2 x (1M out x $10)
    expect(s.lastGenerationAt).toEqual(new Date("2026-10-02")); // UPLOAD ignored
    expect(s.outputTokens).toBe(2_000_000);
  });

  it("reports the most recent model and a distinct-model count", () => {
    const s = summarizeHomepageCost([
      gen({ model: "claude-sonnet-5-5", created_at: new Date("2026-10-01") }),
      gen({ model: "claude-opus-5-5", created_at: new Date("2026-10-02") }),
    ]);
    expect(s.model).toBe("claude-opus-5-5");
    expect(s.modelCount).toBe(2);
  });

  it("flags pre-tracking generations (model null) and never NaN cost", () => {
    const s = summarizeHomepageCost([
      gen({ model: null, input_tokens: null, output_tokens: null }),
    ]);
    expect(s.generations).toBe(1);
    expect(s.hasUntracked).toBe(true);
    expect(s.totalCostUsd).toBe(0);
  });

  it("handles a homepage with no generation passes", () => {
    const s = summarizeHomepageCost([gen({ pass_kind: "UPLOAD" })]);
    expect(s.generations).toBe(0);
    expect(s.lastGenerationAt).toBeNull();
    expect(s.model).toBeNull();
  });
});
