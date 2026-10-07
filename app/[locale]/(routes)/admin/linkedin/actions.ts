"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { beginLinkedInAuthorization, getLinkedInAppOrigin } from "@/lib/linkedin-connect";
import { hasDirectLinkedInOAuth } from "@/lib/linkedin-oauth";

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

export async function getLinkedInSnapshot(organizationId: string) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const normalizedId = organizationId.trim();
  if (!/^\d+$/.test(normalizedId)) throw new Error("Enter a numeric LinkedIn organization ID.");

  const [profile, organizations] = await Promise.all([
    fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${await (await import("@/lib/linkedin-connect")).getLinkedInAccessToken(session.user.id)}` },
      cache: "no-store",
    }).then((response) => response.ok ? response.json() : null),
    (await import("@/lib/linkedin-connect")).linkedInFetch<{ elements?: unknown[] }>(session.user.id, "/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~))"),
  ]);

  let posts: { elements?: unknown[] } = {};
  try {
    posts = await (await import("@/lib/linkedin-connect")).linkedInFetch(session.user.id, `/rest/posts?q=author&author=urn%3Ali%3Aorganization%3A${normalizedId}&count=10`);
  } catch {
    posts = { elements: [] };
  }

  return { profile, organizations, posts };
}
