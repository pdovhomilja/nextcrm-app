import { MongoClient } from "mongodb";

export async function testDatabaseUrl(
  raw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uri = raw.trim();
  if (!uri) return { ok: false, error: "Database URL is required." };

  if (uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://")) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
    try {
      await client.connect();
      await client.db().command({ ping: 1 });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "MongoDB connection failed." };
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  if (uri.startsWith("postgres://") || uri.startsWith("postgresql://")) {
    return {
      ok: false,
      error: "PostgreSQL test from CRM is not enabled yet. Use MongoDB URI for ROFYT.",
    };
  }

  return { ok: false, error: "Use a mongodb:// or mongodb+srv:// connection string." };
}
