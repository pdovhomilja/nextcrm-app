"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { beginLinkedInAuthorization, getLinkedInAccessToken, getLinkedInAppOrigin, linkedInFetch } from "@/lib/linkedin-connect";
import { hasDirectLinkedInOAuth, isLinkedInUserConnected } from "@/lib/linkedin-oauth";
import { linkedInOrgScopesEnabled } from "@/lib/linkedin-org-scopes";

export async function connectLinkedIn() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/sign-in");

  if (hasDirectLinkedInOAuth()) {
    const origin = await getLinkedInAppOrigin();
    return { url: `${origin}/api/linkedin/oauth` };
  }

  const authorization = await beginLinkedInAuthorization(session.user.id);
  return { url: authorization.url };
}

export type LinkedInProfile = {
  name?: string;
  email?: string;
  sub?: string;
};

export async function getLinkedInProfile(): Promise<LinkedInProfile | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  if (!(await isLinkedInUserConnected(session.user.id))) return null;

  try {
    const token = await getLinkedInAccessToken(session.user.id);
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as LinkedInProfile;
    return data;
  } catch {
    return null;
  }
}

export async function getLinkedInConnectionState() {
  const session = await getSession();
  if (!session?.user?.id) {
    return { connected: false, orgFeatures: linkedInOrgScopesEnabled() };
  }
  const connected = await isLinkedInUserConnected(session.user.id);
  return { connected, orgFeatures: linkedInOrgScopesEnabled() };
}

export async function getLinkedInSnapshot(organizationId: string) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const normalizedId = organizationId.trim();
  if (!/^\d+$/.test(normalizedId)) {
    throw new Error("Enter a numeric LinkedIn organization ID.");
  }

  const profile = await getLinkedInProfile();

  if (!linkedInOrgScopesEnabled()) {
    return {
      profile,
      organizations: { elements: [] as unknown[] },
      posts: { elements: [] as unknown[] },
      orgFeaturesDisabled: true as const,
    };
  }

  const organizations = await linkedInFetch<{ elements?: unknown[] }>(
    session.user.id,
    "/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~))",
  );

  let posts: { elements?: unknown[] } = { elements: [] };
  try {
    posts = await linkedInFetch(
      session.user.id,
      `/rest/posts?q=author&author=urn%3Ali%3Aorganization%3A${normalizedId}&count=10`,
    );
  } catch {
    posts = { elements: [] };
  }

  return { profile, organizations, posts, orgFeaturesDisabled: false as const };
}
