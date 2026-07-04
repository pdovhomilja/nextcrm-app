import type { Page } from "@playwright/test";
import { type TaskData, TaskFactory } from "../data/factories";
import { AccountDetailPage, AccountListPage } from "../pages/accounts";
import { TaskFormPage } from "../pages/tasks";

export async function createTask(
  page: Page,
  accountName: string,
  overrides?: Partial<TaskData>,
): Promise<TaskData> {
  const data = TaskFactory.build(overrides);

  await AccountListPage.from(page).open();
  const list = await AccountListPage.create(page);
  await list.clickRow(accountName);

  const detail = await AccountDetailPage.create(page);
  await detail.clickNewTask();

  const form = await TaskFormPage.create(page);
  await form.fill({
    title: data.title,
    content: data.content,
    priority: data.priority,
    assignedTo: data.assignedTo,
  });
  await form.save();

  return data;
}
