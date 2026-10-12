import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "../../../components/ui/Container";
import { getOrderFormData, getProductOptions } from "@/actions/crm/orders/queries";
import { OrderEditor } from "../components/OrderEditor";

export default async function NewOrderPage(props: { searchParams: Promise<{ accountId?: string }> }) {
  const { accountId } = await props.searchParams;
  if (!accountId) notFound();
  const [form, products] = await Promise.all([getOrderFormData(accountId), getProductOptions()]);
  if (!form) notFound();
  const t = await getTranslations("OrdersPage");
  return (
    <Container title={t("new")} description={form.accountName}>
      <OrderEditor mode="new" accountId={accountId} currency={form.currency} priceListName={form.priceListName}
        contacts={form.contacts} products={products}
        header={{ contactId: null, requestedDeliveryDate: null, note: null, ...form.shipping }} lines={[]} />
    </Container>
  );
}
