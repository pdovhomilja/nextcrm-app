jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Ai_Prompt: { findMany: jest.fn(), findFirst: jest.fn() } },
}));
import { prismadb } from "@/lib/prisma";
import { loadActiveStyles, loadAvoidText, loadIndustryBody } from "../load-layers";

type Row = { id: string; body: string; kind: string; scope: string; deletedAt: Date | null; is_default: boolean };
const db = prismadb as unknown as {
  crm_Ai_Prompt: { findMany: jest.Mock; findFirst: jest.Mock };
};
const P = db.crm_Ai_Prompt;

// Minimal in-memory evaluator for the where clauses the loaders use.
let rows: Row[] = [];
const matches = (r: Row, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v);

beforeEach(() => {
  jest.clearAllMocks();
  rows = [];
  P.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    rows.filter((r) => matches(r, where)),
  );
  P.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    rows.find((r) => matches(r, where)) ?? null,
  );
});

const row = (o: Partial<Row> & { id: string; kind: string }): Row => ({
  body: `body-${o.id}`, scope: "ORG", deletedAt: null, is_default: false, ...o,
});

describe("loadActiveStyles", () => {
  it("returns id+body of active ORG HOMEPAGE_STYLE rows, excluding soft-deleted and other kinds/scopes", async () => {
    rows = [
      row({ id: "s1", kind: "HOMEPAGE_STYLE" }),
      row({ id: "s2", kind: "HOMEPAGE_STYLE", deletedAt: new Date() }),
      row({ id: "s3", kind: "HOMEPAGE_STYLE", scope: "USER" }),
      row({ id: "i1", kind: "HOMEPAGE_INDUSTRY" }),
    ];
    expect(await loadActiveStyles()).toEqual([{ id: "s1", body: "body-s1" }]);
  });
  it("empty library -> []", async () => {
    expect(await loadActiveStyles()).toEqual([]);
  });
});

describe("loadAvoidText", () => {
  it("newline-joins multiple active avoid bodies, skipping deleted", async () => {
    rows = [
      row({ id: "a1", kind: "HOMEPAGE_AVOID", body: "no stock photos" }),
      row({ id: "a2", kind: "HOMEPAGE_AVOID", body: "no lorem ipsum" }),
      row({ id: "a3", kind: "HOMEPAGE_AVOID", body: "deleted", deletedAt: new Date() }),
    ];
    expect(await loadAvoidText()).toBe("no stock photos\nno lorem ipsum");
  });
  it("none -> null", async () => {
    expect(await loadAvoidText()).toBeNull();
  });
  it("orders deterministically: created_on then id tie-break", async () => {
    await loadAvoidText();
    expect(P.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ created_on: "asc" }, { id: "asc" }] }),
    );
  });
});

describe("loadIndustryBody", () => {
  const DENTAL = "11111111-1111-4111-8111-111111111111";
  const MISSING = "22222222-2222-4222-8222-222222222222";
  const STYLE = "33333333-3333-4333-8333-333333333333";
  const generic = row({ id: "g", kind: "HOMEPAGE_INDUSTRY", body: "Generic", is_default: true });
  it("returns the selected industry body when set and live", async () => {
    rows = [generic, row({ id: DENTAL, kind: "HOMEPAGE_INDUSTRY", body: "Dental" })];
    expect(await loadIndustryBody(DENTAL)).toBe("Dental");
  });
  it("missing id -> Generic default", async () => {
    rows = [generic];
    expect(await loadIndustryBody(MISSING)).toBe("Generic");
  });
  it("soft-deleted id -> Generic default", async () => {
    rows = [generic, row({ id: DENTAL, kind: "HOMEPAGE_INDUSTRY", body: "Dental", deletedAt: new Date() })];
    expect(await loadIndustryBody(DENTAL)).toBe("Generic");
  });
  it("an id of the wrong kind is not used -> Generic", async () => {
    rows = [generic, row({ id: STYLE, kind: "HOMEPAGE_STYLE", body: "Style" })];
    expect(await loadIndustryBody(STYLE)).toBe("Generic");
  });
  it("null -> Generic default", async () => {
    rows = [generic];
    expect(await loadIndustryBody(null)).toBe("Generic");
  });
  it("non-UUID id is treated as missing (no DB lookup by it) -> Generic", async () => {
    rows = [generic];
    expect(await loadIndustryBody("not-a-uuid")).toBe("Generic");
    expect(P.findFirst).toHaveBeenCalledTimes(1);
  });
  it("Generic lookup is ordered by created_on for determinism", async () => {
    rows = [generic];
    await loadIndustryBody(null);
    expect(P.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_default: true }),
        orderBy: { created_on: "asc" },
      }),
    );
  });
  it("no Generic present -> null", async () => {
    expect(await loadIndustryBody(null)).toBeNull();
    expect(await loadIndustryBody(MISSING)).toBeNull();
  });
});
