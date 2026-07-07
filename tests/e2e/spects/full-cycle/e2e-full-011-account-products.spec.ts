import { test } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { createProduct } from "../../flows/products";
import { unique } from "../../helpers/random";
import { AccountDetailPage, AccountListPage } from "../../pages/accounts";
import { ProductListPage } from "../../pages/products";

test.describe("E2E-FULL-011: Asignación de producto a cuenta (Admin)", () => {
  test("crear producto y cuenta, verificar ambos en sus listados", async ({ page }) => {
    test.setTimeout(60_000);

    const productData = await createProduct(page, {
      name: unique("Account Product"),
      sku: unique("ACC-SKU"),
      unit_price: "5000",
      currency: "USD",
      type: "PRODUCT",
    });

    const accountData = await createAccount(page, {
      name: unique("Product Account"),
      email: "product@accounttest.com",
    });

    await ProductListPage.from(page).open();
    const productList = await ProductListPage.create(page);
    await productList.expectVisible(productData.name);

    await AccountListPage.from(page).open();
    const accountList = await AccountListPage.create(page);
    await accountList.expectVisible(accountData.name);

    await accountList.clickRow(accountData.name);
    const detail = await AccountDetailPage.create(page);
    await detail.expectName(accountData.name);
  });
});
