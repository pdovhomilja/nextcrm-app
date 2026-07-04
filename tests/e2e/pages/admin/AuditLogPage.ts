import { expect, type Locator, type Page } from "@playwright/test";

export class AuditLogPage {
  static readonly urlPattern = /\/admin\/audit-log/;

  static from(page: Page): AuditLogPage {
    return new AuditLogPage(page);
  }

  readonly page: Page;
  readonly table: Locator;
  readonly entityFilter: Locator;
  readonly actionFilter: Locator;

  private constructor(page: Page) {
    this.page = page;
    this.table = page.locator("table, [role='table']").first();

    this.entityFilter = page.getByRole("combobox", {
      name: "All entities",
    });

    this.actionFilter = page.getByRole("combobox", {
      name: "All actions",
    });
  }

  static async create(page: Page): Promise<AuditLogPage> {
    const instance = new AuditLogPage(page);
    await instance.validateRoute();
    await instance.table.waitFor({ state: "visible", timeout: 10_000 });
    return instance;
  }

  async validateRoute(): Promise<void> {
    await this.page.waitForURL(AuditLogPage.urlPattern, { timeout: 10_000 });
  }

  async open(): Promise<void> {
    await this.page.goto("/en/admin/audit-log");
    await this.validateRoute();
    await this.table.waitFor({ state: "visible", timeout: 10_000 });
  }

  async openFiltered(entityType: string, action: string): Promise<void> {
    const params = new URLSearchParams({ entityType, action });
    await this.page.goto(`/en/admin/audit-log?${params.toString()}`);
    await this.table.waitFor({ state: "visible", timeout: 10_000 });
  }

  async expectEntryVisible(action: string, entityName: string): Promise<void> {
    const row = this.table.locator("tr, [role='row']").filter({ hasText: action }).filter({ hasText: entityName });
    await expect(row.first()).toBeVisible({ timeout: 10_000 });
  }

  async expectEntryNotVisible(action: string, entityName: string): Promise<void> {
    const row = this.table.locator("tr, [role='row']").filter({ hasText: action }).filter({ hasText: entityName });
    await expect(row.first()).not.toBeVisible({ timeout: 5_000 });
  }

  async expectAccountCreated(): Promise<void> {
    const row = this.table
      .locator("tr, [role='row']")
      .filter({ hasText: "Account" })
      .filter({ hasText: "created" })
      .first();
    await expect(row).toBeVisible({ timeout: 10_000 });
  }

  async clickRestoreFirst(): Promise<void> {
    const row = this.table.locator("tr").filter({ hasText: "deleted" }).first();
    await row.getByRole("button", { name: "Restore" }).click();
  }

  async filterByEntity(entity: string): Promise<void> {
    await this.entityFilter.click();
    await this.page.locator("[role='option']").filter({ hasText: entity }).click();
  }

  async filterByAction(action: string): Promise<void> {
    await this.actionFilter.click();
    await this.page.locator("[role='option']").filter({ hasText: action }).click();
  }
}
