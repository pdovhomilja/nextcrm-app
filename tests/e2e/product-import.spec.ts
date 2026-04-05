import { test, expect } from "@playwright/test";
import path from "path";

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Product Import", () => {
  test("should open import dialog and download CSV template", async ({
    page,
  }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle");

    await page.locator('button:has-text("Import")').click();

    await expect(
      page.getByRole("heading", { name: "Import Products from CSV" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Download CSV Template/i })
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download CSV Template/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("products_import_template.csv");
  });

  test("should import products from CSV file with preview", async ({
    page,
  }) => {
    await page.goto("/en/crm/products");
    await page.waitForLoadState("networkidle");

    await page.locator('button:has-text("Import")').click();

    await expect(
      page.getByRole("heading", { name: "Import Products from CSV" })
    ).toBeVisible();

    const fixtureFile = path.resolve(__dirname, "../fixtures/products-import.csv");
    await page.locator('input[type="file"]').setInputFiles(fixtureFile);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText("Showing first")).toBeVisible();
    await expect(dialog.getByText("PW Import Widget")).toBeVisible();
    await expect(dialog.getByText("PW Import Service")).toBeVisible();

    await page.getByRole("button", { name: "Confirm Import" }).click();

    await expect(
      page.getByText("imported successfully").or(page.getByText("error(s)"))
    ).toBeVisible({ timeout: 15000 });
  });
});
