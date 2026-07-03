import type { Locator, Page } from "@playwright/test";

export class Modal {
  readonly page: Page;
  readonly overlay: Locator;
  readonly dialog: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.overlay = page.locator("[role='dialog'], .modal-overlay, [data-state='open']").first();
    this.dialog = page.locator("[role='dialog'], .modal-content, .sheet-content").first();
    this.confirmButton = this.dialog.locator(
      "button:has-text('Save'), button:has-text('Confirm'), button:has-text('Delete')",
    );
    this.cancelButton = this.dialog.locator("button:has-text('Cancel'), button:has-text('Close')");
  }

  async waitForOpen(): Promise<void> {
    await this.dialog.waitFor({ state: "visible", timeout: 10_000 });
  }

  async waitForClose(): Promise<void> {
    await this.dialog.waitFor({ state: "hidden", timeout: 10_000 });
  }

  async confirm(): Promise<void> {
    await this.confirmButton.first().click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.first().click();
  }

  async fillInput(label: string, value: string): Promise<void> {
    const field = this.dialog
      .locator(`input, textarea, select`)
      .filter({ hasText: new RegExp(label, "i") })
      .first();
    await field.fill(value);
  }
}
