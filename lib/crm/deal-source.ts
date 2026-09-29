import { prismadb } from "@/lib/prisma";

/**
 * Names of the target list(s) a converted deal originated from.
 *
 * Display-only, derived on read: an opportunity has no stored link back to the
 * target it came from, but a converted target records `converted_account_id` /
 * `converted_contact_id`, so we reverse-look-up the originating target from the
 * opportunity's account + contact (both columns are indexed) and read its
 * target list(s). A target may belong to several lists, so all are returned.
 *
 * The deal's campaign name is resolved by the caller from the campaigns already
 * loaded via `getAllCrmData()`, so it is not fetched here.
 */
export async function getOriginatingTargetListNames(input: {
  accountId: string | null;
  contactId: string | null;
}): Promise<string[]> {
  const { accountId, contactId } = input;

  // Both ids are required to uniquely identify the originating target; a deal
  // created manually (not from a target) has no such match.
  if (!accountId || !contactId) return [];

  const target = await prismadb.crm_Targets.findFirst({
    where: {
      converted_account_id: accountId,
      converted_contact_id: contactId,
      deletedAt: null,
    },
    select: {
      target_lists: {
        select: { target_list: { select: { name: true, deletedAt: true } } },
      },
    },
  });

  return (
    target?.target_lists
      .map((tl) => tl.target_list)
      .filter((list): list is { name: string; deletedAt: Date | null } =>
        Boolean(list) && list.deletedAt === null
      )
      .map((list) => list.name) ?? []
  );
}
