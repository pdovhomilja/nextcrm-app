import type { PageProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { needsOwner } from "./data";

export async function NeedsOwnerPage({ ctx }: PageProps<Settings, Secrets>) {
  const rows = await needsOwner(ctx);
  return (
    <div className="space-y-3 p-4 text-sm">
      <h1 className="text-xl font-semibold">{ctx.t("needsOwner.title")}</h1>
      {rows.length === 0 ? <p className="text-muted-foreground">{ctx.t("needsOwner.empty")}</p> : (
        <table className="w-full">
          <thead><tr className="text-left"><th className="py-1">{ctx.t("needsOwner.account")}</th><th>{ctx.t("needsOwner.salesperson")}</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.accountId} className="border-t"><td className="py-1"><a className="underline" href={`/crm/accounts/${r.accountId}`}>{r.name}</a></td><td>{r.salesperson ?? "—"}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
