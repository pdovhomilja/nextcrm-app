/**
 * E2E test skeleton for the Invoices module.
 *
 * These tests document the happy-path scenarios for the invoices UI.
 * They require a running dev server, a seeded database, and an
 * authenticated Playwright session (see tests/auth.setup.ts).
 *
 * Most test bodies are intentionally left as stubs (`test.skip` or
 * minimal assertions) so the suite can be imported and expanded once
 * the environment is fully configured.
 */

import { test, expect } from "@playwright/test";

test.describe("Invoices module", () => {
  test("navigates to invoices list from sidebar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /invoices/i }).click();
    await expect(page).toHaveURL(/\/invoices/);
    await expect(
      page.getByRole("heading", { name: /invoices/i })
    ).toBeVisible();
  });

  test("creates a new draft invoice", async ({ page }) => {
    await page.goto("/invoices/new");
    // TODO: Fill account select
    // TODO: Fill line items (description, quantity, unit price)
    // TODO: Click Save / Create Draft
    // TODO: Verify redirect to detail page with DRAFT status badge
  });

  test("issues a draft invoice", async ({ page }) => {
    // TODO: Navigate to a known draft invoice detail page
    // TODO: Click the "Issue" button
    // TODO: Confirm in the dialog if one appears
    // TODO: Verify status badge changes to ISSUED
    // TODO: Verify an invoice number appears in the header
  });

  test("downloads PDF of issued invoice", async ({ page }) => {
    // TODO: Navigate to an issued invoice detail page
    // TODO: Click "Download PDF" button
    // TODO: Verify the download event fires or a blob response is returned
  });

  test("adds a payment to an issued invoice", async ({ page }) => {
    // TODO: Navigate to an issued invoice detail page
    // TODO: Click "Add Payment" button
    // TODO: Fill the payment dialog (amount, date, method)
    // TODO: Submit the form
    // TODO: Verify the payment row appears in the payments list
    // TODO: Verify the status transitions (PARTIALLY_PAID or PAID)
  });

  test("searches for an invoice by number", async ({ page }) => {
    await page.goto("/invoices");
    // TODO: Type an invoice number into the search field
    // TODO: Verify matching results appear in the table
  });

  test("navigates to admin invoice settings", async ({ page }) => {
    await page.goto("/admin/invoices/settings");
    await expect(
      page.getByRole("heading", { name: /settings/i })
    ).toBeVisible();
  });

  test("manages tax rates in admin", async ({ page }) => {
    await page.goto("/admin/invoices/tax-rates");
    await expect(
      page.getByRole("heading", { name: /tax rates/i })
    ).toBeVisible();
    // TODO: Create a new tax rate
    // TODO: Verify it appears in the list
    // TODO: Toggle it inactive
  });

  test("manages invoice series in admin", async ({ page }) => {
    await page.goto("/admin/invoices/series");
    await expect(
      page.getByRole("heading", { name: /series/i })
    ).toBeVisible();
    // TODO: Create a new series
    // TODO: Verify it appears in the list
  });
});
