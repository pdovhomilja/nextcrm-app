"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateApiToken,
  listApiTokens,
  revokeApiToken,
} from "@/lib/api-tokens";

export async function createApiToken(data: {
  name: string;
  expiresAt?: Date;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  try {
    const result = await generateApiToken(
      session.user.id,
      data.name,
      data.expiresAt
    );
    return { data: result };
  } catch (error: any) {
    return { error: error.message ?? "Failed to create token" };
  }
}

export async function getApiTokens() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  try {
    const tokens = await listApiTokens(session.user.id);
    return { data: tokens };
  } catch {
    return { error: "Failed to fetch tokens" };
  }
}

export async function deleteApiToken(tokenId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized" };

  try {
    await revokeApiToken(tokenId, session.user.id);
    return { data: "ok" };
  } catch {
    return { error: "Not found or unauthorized" };
  }
}
