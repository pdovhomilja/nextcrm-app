import type { PageProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { needsOwner } from "./data";

export async function NeedsOwnerPage({ ctx }: PageProps<Settings, Secrets>) {
  const rows = await needsOwner(ctx);
  return (
    <div className="space-y-3 p-4 text-sm">
      <h1 className="text-xl font-semibold">{ctx.t("needsOwner.title")}</h1>
      <p className="text-muted-foreground">{ctx.t("needsOwner.help")}</p>
      {rows.length === 0 ? <p className="text-muted-foreground">{ctx.t("needsOwner.empty")}</p> : (
        <ul className="space-y-1">{rows.map((r) => <li key={r.accountId}><a className="underline" href={`/crm/accounts/${r.accountId}`}>{r.name}</a></li>)}</ul>
      )}
    </div>
  );
}
