import { resolveRuntimeDatabaseUrl } from "@/lib/db/runtime-database-url";

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV };
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe("resolveRuntimeDatabaseUrl", () => {
  it("uses RUNTIME_DATABASE_URL when set (transaction pooler)", () => {
    process.env.DATABASE_URL = "postgresql://session:5432/db";
    process.env.RUNTIME_DATABASE_URL = "postgresql://txn:6543/db";

    expect(resolveRuntimeDatabaseUrl()).toBe("postgresql://txn:6543/db");
  });

  it("trims surrounding whitespace on the runtime URL", () => {
    process.env.DATABASE_URL = "postgresql://session:5432/db";
    process.env.RUNTIME_DATABASE_URL = "  postgresql://txn:6543/db  ";

    expect(resolveRuntimeDatabaseUrl()).toBe("postgresql://txn:6543/db");
  });

  it("falls back to DATABASE_URL when RUNTIME_DATABASE_URL is unset", () => {
    process.env.DATABASE_URL = "postgresql://session:5432/db";
    delete process.env.RUNTIME_DATABASE_URL;

    expect(resolveRuntimeDatabaseUrl()).toBe("postgresql://session:5432/db");
  });

  it("falls back to DATABASE_URL when RUNTIME_DATABASE_URL is blank/whitespace", () => {
    process.env.DATABASE_URL = "postgresql://session:5432/db";
    process.env.RUNTIME_DATABASE_URL = "   ";

    expect(resolveRuntimeDatabaseUrl()).toBe("postgresql://session:5432/db");
  });
});
