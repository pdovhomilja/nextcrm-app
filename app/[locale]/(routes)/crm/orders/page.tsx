import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "../../components/ui/Container";
import { getOrders, getOwnerOptions } from "@/actions/crm/orders/queries";
import { OrdersTable } from "./components/OrdersTable";

const STATUSES = ["DRAFT", "PENDING_APPROVAL", "READY", "SENT", "CONFIRMED", "DELIVERED", "INVOICED", "PAID", "CANCELLED", "SYNC_FAILED"];

export default async function OrdersPage(props: { searchParams: Promise<{ status?: string; owner?: string }> }) {
  const t = await getTranslations("OrdersPage");
  const { status, owner } = await props.searchParams;
  const [rows, owners] = await Promise.all([
    getOrders({ status: STATUSES.includes(status ?? "") ? status : undefined, ownerId: owner || undefined }),
    getOwnerOptions(),
  ]);
  return (
    <Container title={t("title")} description={t("description")}>
      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <select name="status" defaultValue={status ?? ""} className="rounded-md border px-2 py-1">
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status${s}` as never)}</option>)}
        </select>
        {owners.length > 0 && (
          <select name="owner" defaultValue={owner ?? ""} className="rounded-md border px-2 py-1">
            <option value="">{t("allOwners")}</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name ?? o.id}</option>)}
          </select>
        )}
        <button className="rounded-md border px-3 py-1" type="submit">{t("filter")}</button>
        <Link className="ml-auto text-muted-foreground underline" href="/crm/accounts">{t("newHint")}</Link>
      </form>
      <OrdersTable rows={rows} />
    </Container>
  );
}
