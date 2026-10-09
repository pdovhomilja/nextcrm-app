import type { AdminSectionProps } from "@nextcrm/plugin-sdk";
import type { Settings } from "../settings";

export async function ConflictsSection({ ctx }: AdminSectionProps<Settings>) {
  const conflicts = (await ctx.store.list("conflict:")).map((e) => ({ id: e.key.slice(9), ...(e.value as { key: string; otherAccountId: string }) }));
  const name = async (id: string) => String((await ctx.data.accounts.get(id))?.name ?? id);
  const rows = [];
  for (const c of conflicts) rows.push({ ...c, name: await name(c.id), otherName: await name(c.otherAccountId) });
  return (
    <section className="space-y-2 text-sm">
      <h2 className="font-medium">{ctx.t("admin.conflicts")}</h2>
      {rows.length === 0 ? <p className="text-muted-foreground">{ctx.t("admin.conflictsEmpty")}</p> : (
        <table className="w-full">
          <thead><tr className="text-left text-muted-foreground"><th>{ctx.t("admin.key")}</th><th>{ctx.t("admin.account")}</th><th>{ctx.t("admin.other")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1 pr-4">{r.key}</td>
                <td className="py-1 pr-4"><a className="underline" href={`/crm/accounts/${r.id}`}>{r.name}</a></td>
                <td className="py-1"><a className="underline" href={`/crm/accounts/${r.otherAccountId}`}>{r.otherName}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
