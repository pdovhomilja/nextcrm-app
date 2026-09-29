/**
 * Guards the Supabase pooler connection budget (docs/guides/platform/SUPABASE_ON_VERCEL.md §3–4).
 *
 * The `pg` Pool behind Prisma must:
 *   1. cap `max` from `DB_POOL_MAX` (default 3) instead of leaving pg's default
 *      of 10 — at 10, two warm Vercel instances exhaust the QA/prod session-mode
 *      pooler (pool_size 15) and every request 500s with
 *      `(EMAXCONNSESSION) max clients reached in session mode`, which surfaces as
 *      better-auth `FAILED_TO_GET_SESSION` on every page; and
 *   2. attach a Pool-level `error` handler so Supavisor idle-reaps
 *      (`57P01 terminating connection due to administrator command`) are swallowed
 *      instead of crashing the warm function instance as an uncaught exception.
 */

const poolCtorArgs: Array<Record<string, unknown>> = [];
const registeredEvents: string[] = [];

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation((cfg: Record<string, unknown>) => {
    poolCtorArgs.push(cfg);
    return {
      on: jest.fn((event: string) => {
        registeredEvents.push(event);
      }),
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
    };
  }),
}));

jest.mock("@prisma/adapter-pg", () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({ $disconnect: jest.fn() })),
}));

describe("lib/prisma pg Pool configuration", () => {
  const originalPoolMax = process.env.DB_POOL_MAX;

  beforeEach(() => {
    poolCtorArgs.length = 0;
    registeredEvents.length = 0;
    // The module memoizes the client on `global.cachedPrisma` outside production;
    // drop it (and the module registry) so each test re-runs the singleton factory.
    delete (global as { cachedPrisma?: unknown }).cachedPrisma;
    jest.resetModules();
    delete process.env.DB_POOL_MAX;
  });

  afterAll(() => {
    if (originalPoolMax === undefined) delete process.env.DB_POOL_MAX;
    else process.env.DB_POOL_MAX = originalPoolMax;
  });

  it("caps the pool at DB_POOL_MAX with a default of 3 (never pg's default of 10)", () => {
    require("@/lib/prisma");

    expect(poolCtorArgs).toHaveLength(1);
    expect(poolCtorArgs[0]).toMatchObject({ max: 3 });
  });

  it("honors an explicit DB_POOL_MAX override", () => {
    process.env.DB_POOL_MAX = "7";

    require("@/lib/prisma");

    expect(poolCtorArgs[0]).toMatchObject({ max: 7 });
  });

  it("falls back to 3 when DB_POOL_MAX is empty or non-numeric (never pg's 10)", () => {
    // An empty-string env value (a common Vercel-dashboard mistake) must NOT
    // become max:0 → pg's falsy fallback of 10, which re-creates the exhaustion.
    process.env.DB_POOL_MAX = "";

    require("@/lib/prisma");

    expect(poolCtorArgs[0]).toMatchObject({ max: 3 });
  });

  it("attaches a Pool-level 'error' handler so idle-reaps don't crash the instance", () => {
    require("@/lib/prisma");

    expect(registeredEvents).toContain("error");
  });
});
