"use server";
import { revalidatePath } from "next/cache";
import { revokeAllApiTokens } from "@/lib/api-tokens";
import {
  requireRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const revokeUserApiTokens = async (userId: string) => {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  if (!userId) return { error: "userId is required" };

  try {
    const revoked = await revokeAllApiTokens(userId);
    revalidatePath("/[locale]/(routes)/admin", "page");
    return { data: { revoked } };
  } catch (error) {
    console.log("[REVOKE_USER_API_TOKENS]", error);
    return { error: "Failed to revoke API tokens" };
  }
};
