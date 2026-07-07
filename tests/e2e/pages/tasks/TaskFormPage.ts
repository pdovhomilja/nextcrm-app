import type { Locator, Page } from "@playwright/test";
import { BaseFormPage } from "../BaseFormPage";

export class TaskFormPage extends BaseFormPage {
  static readonly urlPattern = /\/crm\/accounts\/[a-f0-9-]+/;

  static from(page: Page): TaskFormPage {
    return new TaskFormPage(page);
  }

  static async create(page: Page): Promise<TaskFormPage> {
    const instance = new TaskFormPage(page);
    await instance.validateFormVisible();
    return instance;
  }

  private constructor(page: Page) {
    super(page);
    this.titleInput = page.getByRole("textbox", { name: /task name|title/i });
    this.contentInput = page.getByRole("textbox", { name: /task description|content/i });
    this.submitButton = page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .getByRole("button", { name: /Create|Save|Submit/ });
  }

  readonly titleInput: Locator;
  readonly contentInput: Locator;
  readonly submitButton: Locator;

  async fill(data: { title?: string; content?: string; priority?: string; assignedTo?: string }): Promise<void> {
    if (data.title) await this.titleInput.fill(data.title);
    if (data.content) await this.contentInput.fill(data.content);
    if (data.priority) await this.selectPriority(data.priority);
    if (data.assignedTo) await this.selectAssignedUser(data.assignedTo);
  }

  async selectPriority(priority: string): Promise<void> {
    const trigger = this.page.locator("button:has-text('Select tasks priority'), button:has-text('priority')").first();
    await trigger.click();
    await this.page
      .getByRole("option", { name: new RegExp(priority, "i") })
      .first()
      .click();
  }

  async selectAssignedUser(name: string): Promise<void> {
    const trigger = this.page.getByRole("combobox").filter({ hasText: "Select assigned user" });
    await trigger.click();
    const searchInput = this.page.locator("[cmdk-input]");
    await searchInput.waitFor({ state: "visible", timeout: 5_000 });
    await searchInput.fill(name);
    const option = this.page.locator("[cmdk-item]").filter({ hasText: name }).first();
    await option.waitFor({ state: "visible", timeout: 5_000 });
    await option.click();
  }

  async save(): Promise<void> {
    await this.submitButton.click();
    await this.page
      .locator("[data-state='open'][role='dialog'], [data-state='open'][data-slot='sheet']")
      .first()
      .waitFor({ state: "hidden", timeout: 15_000 });
  }
}
