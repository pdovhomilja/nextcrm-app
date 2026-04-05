import Container from "@/app/[locale]/(routes)/components/ui/Container";
import { getProduct } from "@/actions/crm/products/get-product";
import { getProductCategories } from "@/actions/crm/products/get-product-categories";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { serializeDecimals, serializeDecimalsList } from "@/lib/serialize-decimals";

import { BasicView } from "./components/BasicView";
import { AccountsTab } from "./components/AccountsTab";
import { HistoryTab } from "./components/HistoryTab";
import { EditProductButton } from "./components/EditProductButton";

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

const ProductPage = async (props: ProductDetailPageProps) => {
  const params = await props.params;
  const { productId } = params;

  const [product, categories, crmData] = await Promise.all([
    getProduct(productId),
    getProductCategories(),
    getAllCrmData(),
  ]);

  if (!product) return <div>Product not found</div>;

  // Serialize decimal values for client components
  const serializedProduct = serializeDecimals(product);
  const serializedAssignments = serializeDecimalsList(
    product.accountProducts ?? []
  );

  const currencies = crmData.currencies.map(
    (c: { code: string; name: string; symbol: string }) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
    })
  );

  const productForEdit = {
    id: serializedProduct.id,
    name: serializedProduct.name,
    description: serializedProduct.description,
    sku: serializedProduct.sku,
    type: serializedProduct.type,
    status: serializedProduct.status,
    unit_price: serializedProduct.unit_price as unknown as number,
    unit_cost: serializedProduct.unit_cost as unknown as number | null,
    currency: serializedProduct.currency,
    tax_rate: serializedProduct.tax_rate as unknown as number | null,
    unit: serializedProduct.unit,
    is_recurring: serializedProduct.is_recurring,
    billing_period: serializedProduct.billing_period,
    category: serializedProduct.category,
  };

  return (
    <Container
      title={`Product: ${product.name}`}
      description={`Status: ${product.status}`}
    >
      <div className="flex justify-end mb-4">
        <EditProductButton
          product={productForEdit}
          categories={categories}
          currencies={currencies}
        />
      </div>
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="accounts">
            Accounts ({serializedAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="basic">
          <BasicView
            data={{
              ...serializedProduct,
              unit_price: serializedProduct.unit_price as unknown as number,
              unit_cost: serializedProduct.unit_cost as unknown as number | null,
              tax_rate: serializedProduct.tax_rate as unknown as number | null,
            }}
          />
        </TabsContent>
        <TabsContent value="accounts">
          <AccountsTab
            assignments={serializedAssignments}
            productPrice={serializedProduct.unit_price as unknown as number}
            productCurrency={serializedProduct.currency}
          />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab productId={productId} />
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default ProductPage;
