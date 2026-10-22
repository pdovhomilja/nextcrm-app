"use server";

import { getSession } from "@/lib/auth-server";
import { isAdmin } from "@/lib/authz";
import { summarizeLinkedInOrgActivity } from "@/lib/linkedin/ai-intelligence";
import { rememberConversationTurn } from "@/lib/mem0/crm-memory";

import { getLinkedInSnapshot } from "./actions";

export async function analyzeLinkedInOrganization(organizationId: string) {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in required." };
  if (!isAdmin({ id: session.user.id, role: session.user.role ?? "user" })) {
    return { ok: false as const, error: "Admin access required." };
  }

  try {
    const snapshot = await getLinkedInSnapshot(organizationId);
    if (snapshot.orgFeaturesDisabled) {
      return { ok: false as const, error: "Organization APIs are disabled. Enable LINKEDIN_ORG_SCOPES." };
    }
    const posts = snapshot.posts?.elements ?? [];
    const brief = await summarizeLinkedInOrgActivity({
      organizationId,
      postElements: posts,
      actorUserId: session.user.id,
    });
    if (!brief) {
      return { ok: false as const, error: "No post text to analyze or AI unavailable." };
    }
    return { ok: true as const, brief };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return { ok: false as const, error: msg };
  }
}

export async function saveLinkedInIcpProfile(icpText: string) {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false as const, error: "Sign in required." };
  if (!isAdmin({ id: session.user.id, role: session.user.role ?? "user" })) {
    return { ok: false as const, error: "Admin access required." };
  }

  const trimmed = icpText.trim();
  if (!trimmed || trimmed.length < 20) {
    return { ok: false as const, error: "Describe your ideal customer in at least a few sentences." };
  }

  await rememberConversationTurn({
    userId: process.env.LINKEDIN_MEM0_USER_ID?.trim() || "nextcrm:linkedin-icp",
    surface: "linkedin-icp",
    userText: "ICP profile update",
    assistantText: trimmed,
  });

  return { ok: true as const };
}
