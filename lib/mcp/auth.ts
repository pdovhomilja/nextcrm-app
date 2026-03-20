import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateApiToken } from "@/lib/api-tokens";

export interface McpUser {
  id: string;
}

export async function getMcpUser(): Promise<McpUser> {
  const hdrs = await headers();
  const authHeader = hdrs.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearer?.startsWith("nxtc__")) {
    const userId = await validateApiToken(bearer);
    return { id: userId };
  }

  // Development-only fallback: NextAuth session cookie
  // Not used in production — session cannot substitute for token revocation
  if (process.env.NODE_ENV === "development") {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      return { id: session.user.id };
    }
  }

  throw new Error("Unauthorized");
}
