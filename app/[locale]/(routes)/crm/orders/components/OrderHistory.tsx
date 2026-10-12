import { getTranslations } from "next-intl/server";
import { getOrderHistory } from "@/actions/crm/orders/queries";

export async function OrderHistory({ orderId }: { orderId: string }) {
  const t = await getTranslations("OrdersPage");
  const rows = await getOrderHistory(orderId);
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t("noHistory")}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => {
        const changes = Array.isArray(r.changes) ? (r.changes as { field: string; old?: unknown; new?: unknown }[]) : [];
        return (
          <li key={r.id} className="border-b pb-2">
            <span className="text-muted-foreground">{r.createdAt.slice(0, 16).replace("T", " ")}</span> · {r.userName ?? t("system")} · {t(`action_${r.action}` as never)}
            {changes.map((c, i) => (
              <div key={i} className="pl-4">
                {c.field === "status" ? `${t(`status${c.old}` as never)} → ${t(`status${c.new}` as never)}` : `${c.field}: ${String(c.old ?? "—")} → ${String(c.new ?? "—")}`}
              </div>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
