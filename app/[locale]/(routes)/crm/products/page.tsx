import React, { Suspense } from "react";
import Container from "../../components/ui/Container";
import CrmTableSkeleton from "@/components/skeletons/crm-table-skeleton";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getProductsFull } from "@/actions/crm/products/get-products";
import { getProductCategories } from "@/actions/crm/products/get-product-categories";
import ProductsView from "../components/ProductsView";
import { serializeDecimalsList } from "@/lib/serialize-decimals";

const ProductsPage = async () => {
  const [products, categories, crmData] = await Promise.all([
    getProductsFull(),
    getProductCategories(),
    getAllCrmData(),
  ]);

  const serializedProducts = serializeDecimalsList(products);

  return (
    <Container
      title="Products"
      description="Manage your product and service catalog"
    >
      <Suspense fallback={<CrmTableSkeleton />}>
        <ProductsView
          data={serializedProducts}
          categories={categories}
          currencies={crmData.currencies.map((c: { code: string; name: string; symbol: string }) => ({
            code: c.code,
            name: c.name,
            symbol: c.symbol,
          }))}
        />
      </Suspense>
    </Container>
  );
};

export default ProductsPage;
