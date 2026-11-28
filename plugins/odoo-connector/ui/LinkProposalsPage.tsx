import type { PageProps } from "@nextcrm/plugin-sdk";
import { localTime, type Settings, type Secrets } from "../settings";
import type { Proposal } from "../store";

/** Managers confirm or reject first links the sync found (open proposals only). */
export async function LinkProposalsPage({ ctx, actionButton }: PageProps<Settings, Secrets>) {
  const open = (await ctx.store.list("proposal:")).map((e) => e.value as Proposal);
  const accounts = new Map((await Promise.all(open.map((p) => ctx.data.accounts.get(p.accountId)))).filter((a) => a).map((a) => [a!.id as string, a!.name as string]));
  return (
    <div className="space-y-3 p-4 text-sm">
      <h1 className="text-xl font-semibold">{ctx.t("proposals.title")}</h1>
      <p className="text-muted-foreground">{ctx.t("proposals.help")}</p>
      {open.length === 0 ? <p className="text-muted-foreground">{ctx.t("proposals.empty")}</p> : (
        <table className="w-full">
          <thead><tr className="text-left"><th className="py-1">{ctx.t("proposals.customer")}</th><th>{ctx.t("proposals.account")}</th><th>{ctx.t("proposals.reason")}</th><th>{ctx.t("proposals.found")}</th><th /></tr></thead>
          <tbody>{open.map((p) => {
            const input = { partnerId: String(p.partnerId), accountId: p.accountId };
            return (
              <tr key={p.partnerId} className="border-t">
                <td className="py-1">{p.name} (#{p.partnerId})</td>
                <td><a className="underline" href={`/crm/accounts/${p.accountId}`}>{accounts.get(p.accountId) ?? p.accountId.slice(0, 8)}</a></td>
                <td>{ctx.t(`admin.reason.${p.reason}`)}</td>
                <td>{localTime(ctx, p.foundAt)}</td>
                <td className="space-x-2 text-right">
                  {actionButton({ action: "confirm", input, label: ctx.t("proposals.confirm") })}
                  {actionButton({ action: "reject", input, label: ctx.t("proposals.reject") })}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      )}
    </div>
  );
}
