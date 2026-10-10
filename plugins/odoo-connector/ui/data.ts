import type { Ctx } from "../settings";
import type { AccountLink } from "../store";
import { K } from "../store";

export async function needsOwner(ctx: Ctx): Promise<{ accountId: string; name: string; salesperson: string | null }[]> {
  const out: { accountId: string; name: string; salesperson: string | null }[] = [];
  for (const e of await ctx.store.list("account:")) {
    const accountId = e.key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (acc && acc.deletedAt == null && !acc.assigned_to) out.push({ accountId, name: String(acc.name ?? accountId), salesperson: (e.value as AccountLink).salesperson ?? null });
  }
  return out;
}

export async function panelData(ctx: Ctx, accountId: string) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  return {
    partnerId: link.partnerId,
    url: `${ctx.settings.url.replace(/\/+$/, "")}/odoo/contacts/${link.partnerId}`,
    syncedAt: link.syncedAt,
    archived: !!link.archived,
    notCustomer: !!link.notCustomer,
  };
}
