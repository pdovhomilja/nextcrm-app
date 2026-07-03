import { test, expect } from "@playwright/test";
import { createAccount } from "../../flows/accounts";
import { AccountDetailPage, AccountListPage } from "../../pages/accounts";
import { unique } from "../../helpers/random";

test.describe("Activities - Validaciones", () => {
  test("PEAC-001: rechazar title vacío en actividad", async ({ page }) => {
    const account = await createAccount(page, { name: unique("Cuenta Activity E2E") });

    await AccountListPage.from(page).open();
    const list = await AccountListPage.create(page);
    await list.clickRow(account.name);

    const detail = await AccountDetailPage.create(page);

    const logButton = page.getByRole("button", { name: "Log activity" });
    await expect(logButton).toBeVisible({ timeout: 10_000 });
    await logButton.click();

    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 10_000 });

    const titleInput = dialog.getByRole("textbox", { name: /title/i });
    await titleInput.fill(" ");

    const dateInput = dialog.locator("input[type='datetime-local']");
    await dateInput.fill("2026-07-03T15:00");

    const submitBtn = dialog.getByRole("button", { name: /log activity/i });
    await submitBtn.click();

    await expect(page.getByText("Title is required")).toBeVisible({ timeout: 5_000 });
  });
});
