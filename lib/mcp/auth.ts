import { validateApiToken } from "@/lib/api-tokens";
import { getSession } from "@/lib/auth-server";

export interface McpUser {
  id: string;
}

export async function getMcpUser(): Promise<McpUser> {
  const { headers } = await import("next/headers");
  const hdrs = await headers();
  const authHeader = hdrs.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearer?.startsWith("nxtc__")) {
    const userId = await validateApiToken(bearer);
    return { id: userId };
  }

  // Development-only fallback: better-auth session cookie
  // Not used in production — session cannot substitute for token revocation
  if (process.env.NODE_ENV === "development") {
    const session = await getSession();
    if (session?.user?.id) {
      return { id: session.user.id };
    }
  }

  throw new Error("Unauthorized");
}
