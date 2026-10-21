import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getRedisCacheDiagnostics } from "@/lib/cache/upstash-redis";

/** Admin-only: verify Upstash/KV Redis is reachable (mailbox + search cache). */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const redis = await getRedisCacheDiagnostics();
  return NextResponse.json({
    redis,
    usesRedisFor: [
      "Email mailbox list + folder counts (lib/email/mailbox-cache.ts)",
      "CRM full-text search cache (lib/cache/search-cache.ts)",
      "Public leads rate limit",
    ],
    usesNextDataCacheFor: [
      "App shell: currencies, permissions, plugin nav, user access",
      "Dashboard metric tiles",
      "Live header summary API (~20s)",
    ],
  });
}
