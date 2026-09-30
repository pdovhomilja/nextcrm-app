"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanWriteTarget,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";
import { ensureUniqueSlug, slugify } from "@/lib/homepage/slug";

export const updateHomepageSlug = async (data: { homepageId: string; slug: string }) => {
  const { homepageId } = data;
  if (!homepageId) return { error: "homepageId is required" };
  const wanted = slugify(data.slug ?? "");
  if (!wanted) return { error: "slug is required" };

  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return { error: "Unauthorized" };
    throw e;
  }

  const homepage = await prismadb.crm_Target_Homepage.findFirst({
    where: { id: homepageId, deletedAt: null },
    select: {
      id: true,
      targetId: true,
      slug: true,
      status: true,
      preview_url: true,
      current_version_id: true,
    },
  });
  if (!homepage) return { error: "Homepage not found" };

  try {
    await assertCanWriteTarget(user, homepage.targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  // Renaming only edits the DB row: the published objects stay under the old
  // slug, so a rename would 404 the live (possibly emailed) link. Only allow it
  // for a never-published page, whatever its status (a FAILED refine/regenerate
  // of a live page still has its preview_url / version and must stay locked).
  if (homepage.status === "PENDING" || homepage.status === "RUNNING") {
    return { error: "Can't rename while generating." };
  }
  if (homepage.preview_url || homepage.current_version_id || homepage.status === "READY") {
    return { error: "This page is already published; regenerate to change its URL." };
  }

  // Unchanged: ensureUniqueSlug would see our own row and suffix it "-2".
  if (wanted === homepage.slug) return { data: { slug: homepage.slug } };

  try {
    const slug = await ensureUniqueSlug(data.slug);
    await prismadb.crm_Target_Homepage.update({ where: { id: homepage.id }, data: { slug } });
    return { data: { slug } };
  } catch (e) {
    // ensureUniqueSlug is check-then-write, so a concurrent pick can still collide.
    if ((e as { code?: string })?.code === "P2002") return { error: "That slug is taken, pick another." };
    throw e;
  }
};
