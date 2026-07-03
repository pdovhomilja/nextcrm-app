import { expect, type Locator, type Page } from "@playwright/test";

export class ActivityFormPage {
  readonly page: Page;
  readonly typeSelect: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly durationInput: Locator;
  readonly statusSelect: Locator;
  readonly outcomeInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.typeSelect = page.getByRole("combobox", { name: /type/i });
    this.titleInput = page.getByRole("textbox", { name: /title/i });
    this.descriptionInput = page.getByRole("textbox", { name: /description/i });
    this.dateInput = page.getByRole("textbox", { name: /date/i });
    this.timeInput = page.getByRole("textbox", { name: /time/i });
    this.durationInput = page.getByRole("textbox", { name: /duration/i });
    this.statusSelect = page.getByRole("combobox", { name: /status/i });
    this.outcomeInput = page.getByRole("textbox", { name: /outcome/i });
    this.submitButton = page.getByRole("button", { name: /save|create|log/i });
  }

  async fill(data: {
    type?: string;
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    duration?: string;
    status?: string;
    outcome?: string;
  }): Promise<void> {
    if (data.type) await this.typeSelect.selectOption(data.type);
    if (data.title) await this.titleInput.fill(data.title);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.date) await this.dateInput.fill(data.date);
    if (data.time) await this.timeInput.fill(data.time);
    if (data.duration) await this.durationInput.fill(data.duration);
    if (data.status) await this.statusSelect.selectOption(data.status);
    if (data.outcome) await this.outcomeInput.fill(data.outcome);
  }

  async save(): Promise<void> {
    await this.submitButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.page.locator(`text=${message}`).first()).toBeVisible({ timeout: 5_000 });
  }
}
