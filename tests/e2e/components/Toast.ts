import { expect, type Locator, type Page } from "@playwright/test";

export class Toast {
  readonly container: Locator;

  constructor(page: Page) {
    this.container = page.locator("[data-sonner-toast], [role='status'], .toast").first();
  }

  async waitForVisible(): Promise<void> {
    await this.container.waitFor({ state: "visible", timeout: 10_000 });
  }

  async expectText(text: string): Promise<void> {
    await this.waitForVisible();
    await expect(this.container).toContainText(text);
  }

  async dismiss(): Promise<void> {
    if (await this.container.isVisible()) {
      await this.container.click();
    }
  }
}
