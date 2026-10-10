import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "../../../components/ui/Container";
import { requireAuthenticated } from "@/lib/authz";
import { getOrder, getOrderFormData, getProductOptions } from "@/actions/crm/orders/queries";
import { getOrderPanels } from "@/lib/plugins/slots";
import { PluginSlot } from "@/lib/plugins/ui/PluginSlot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderEditor } from "../components/OrderEditor";
import { OrderView } from "../components/OrderView";
import { OrderActions } from "../components/OrderActions";
import { OrderHistory } from "../components/OrderHistory";
import { StatusBadge } from "../components/StatusBadge";

export default async function OrderPage(props: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await props.params;
  const user = await requireAuthenticated();
  const order = await getOrder(orderId);
  if (!order) notFound();
  const t = await getTranslations("OrdersPage");
  const editable = order.allowedActions?.includes("edit") ?? false;
  const [form, products, panels] = await Promise.all([
    editable ? getOrderFormData(order.accountId) : null,
    editable ? getProductOptions() : [],
    getOrderPanels(user.role),
  ]);
  const actor = { type: "user" as const, userId: user.id, role: user.role };
  return (
    <Container title={`${t("title")} ${order.number}`} description={order.accountName ?? ""}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge status={order.status} />
          <Link className="underline" href={`/crm/accounts/${order.accountId}`}>{order.accountName}</Link>
          {order.ownerName && <span>{t("owner")}: {order.ownerName}</span>}
          {order.status === "PENDING_APPROVAL" && order.approvalRequestedAt && <span>{t("approvalPending", { date: order.approvalRequestedAt.slice(0, 10) })}</span>}
          {order.approvedAt && <span>{t("approved", { date: order.approvedAt.slice(0, 10) })}</span>}
          {order.status === "DRAFT" && order.approvalNote && <span className="text-destructive">{t("rejected", { note: order.approvalNote })}</span>}
        </div>
        <OrderActions order={order} />
        <Tabs defaultValue="order">
          <TabsList>
            <TabsTrigger value="order">{t("lines")}</TabsTrigger>
            <TabsTrigger value="history">{t("history")}</TabsTrigger>
          </TabsList>
          <TabsContent value="order" className="space-y-6">
            {editable && form ? (
              <OrderEditor mode="edit" orderId={order.id} accountId={order.accountId} currency={order.currency} priceListName={order.priceListName}
                contacts={form.contacts} products={products}
                header={{ contactId: order.contactId, shipping_street: order.shipping_street, shipping_city: order.shipping_city, shipping_state: order.shipping_state,
                  shipping_postal_code: order.shipping_postal_code, shipping_country: order.shipping_country, requestedDeliveryDate: order.requestedDeliveryDate, note: order.note }}
                lines={order.lines.map((l) => ({ key: l.id, productId: l.productId, productName: l.productName, quantity: l.quantity, listPrice: l.listPrice, unitPrice: l.unitPriceOverridden ? l.unitPrice : "", vatRate: l.vatRate }))} />
            ) : (
              <OrderView order={order} />
            )}
            {panels.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-medium">{t("pluginPanels")}</h2>
                {panels.map(({ plugin, panel }) => (
                  <PluginSlot key={`${plugin.definition.id}:${panel.id}`} plugin={plugin} actor={actor} render={(ctx) => panel.component({ orderId: order.id, ctx })} />
                ))}
              </section>
            )}
          </TabsContent>
          <TabsContent value="history"><OrderHistory orderId={order.id} /></TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}
