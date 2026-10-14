import { resolvePgSslConfig } from "@/lib/database-url";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("resolvePgSslConfig", () => {
  it("skips SSL for local Docker Postgres", () => {
    expect(
      resolvePgSslConfig("postgresql://nextcrm:nextcrm@localhost:5433/nextcrm")
    ).toBeUndefined();
  });

  it("uses relaxed TLS verification for remote hosts", () => {
    expect(
      resolvePgSslConfig(
        "postgres://user:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
      )
    ).toEqual({ rejectUnauthorized: false });
  });

  it("honors DATABASE_SSL_REJECT_UNAUTHORIZED=1", () => {
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = "1";
    expect(
      resolvePgSslConfig("postgres://user:pass@db.example.com:5432/app")
    ).toEqual({ rejectUnauthorized: true });
  });
});
