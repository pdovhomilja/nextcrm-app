import { auth } from "@/auth";
import { headers } from "next/headers";
import { validateApiToken } from "@/lib/security/api-token-service";

export interface McpUser {
  id: string;
  companyId: string;
}

/**
 * Resolve the calling user for Vercel MCP adapter routes.
 * Tries session auth first, then falls back to bearer token / X-API-Key.
 */
export async function getMcpUser(): Promise<McpUser> {
  // Strategy 1: session cookie (browser / same-origin)
  const session = await auth();
  if (session?.user?.id && session.user.activeCompanyId) {
    return { id: session.user.id, companyId: session.user.activeCompanyId };
  }

  // Strategy 2: bearer token / X-API-Key header (external agents)
  const hdrs = await headers();
  const bearer = hdrs.get("authorization")?.replace("Bearer ", "");
  const apiKey = hdrs.get("x-api-key");
  const token = bearer || apiKey;

  if (token) {
    const result = await validateApiToken(token);
    if (result.valid && result.userId && result.companyId) {
      return { id: result.userId, companyId: result.companyId };
    }
  }

  throw new Error("Unauthorized");
}
