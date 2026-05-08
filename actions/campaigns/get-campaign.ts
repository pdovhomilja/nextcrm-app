"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  assertCanReadCampaign,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/authz";

export const getCampaign = async (id: string) => {
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof AuthenticationError) return null;
    throw e;
  }

  try {
    await assertCanReadCampaign(user, id);
  } catch (e) {
    if (e instanceof AuthorizationError) return null;
    throw e;
  }

  return prismadb.crm_campaigns.findUnique({
    where: { id },
    include: {
      template: true,
      steps: {
        orderBy: { order: "asc" },
        include: {
          template: true,
          sends: {
            select: {
              status: true,
              opened_at: true,
              clicked_at: true,
              unsubscribed_at: true,
            },
          },
        },
      },
      target_lists: { include: { target_list: { select: { id: true, name: true } } } },
      sends: {
        include: { target: { select: { first_name: true, last_name: true } } },
        orderBy: { sent_at: "desc" },
      },
    },
  });
};
