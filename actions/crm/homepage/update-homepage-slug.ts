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
    select: { id: true, targetId: true, slug: true },
  });
  if (!homepage) return { error: "Homepage not found" };

  try {
    await assertCanWriteTarget(user, homepage.targetId);
  } catch (e) {
    if (e instanceof AuthorizationError) return { error: "Forbidden" };
    throw e;
  }

  // Unchanged: ensureUniqueSlug would see our own row and suffix it "-2".
  if (wanted === homepage.slug) return { data: { slug: homepage.slug } };

  const slug = await ensureUniqueSlug(data.slug);
  await prismadb.crm_Target_Homepage.update({ where: { id: homepage.id }, data: { slug } });
  return { data: { slug } };
};
