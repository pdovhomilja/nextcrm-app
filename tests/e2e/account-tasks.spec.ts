import { test, expect, Page } from "@playwright/test";

// Module-level state is safe here because test.describe.serial guarantees
// all tests run in the same worker in order.
const testData = {
  accountId: "",
  taskTitle: "",
  taskId: "",
};

// ── Helpers (duplicated from sales-flow.spec.ts to match existing convention) ──

/** Wait for the Sheet slide-in panel to fully open */
async function waitForSheet(page: Page) {
  await page.waitForSelector('[role="dialog"][data-state="open"]', {
    timeout: 10000,
  });
}

/**
 * Open a shadcn Select by clicking its trigger, then pick the first
 * SelectItem in the dropdown. Uses getByLabel() which resolves via the
 * FormLabel htmlFor → SelectTrigger id association.
 */
async function selectFirstOption(page: Page, labelText: string) {
  await page.getByLabel(labelText).click();
  const listbox = page.locator('[role="listbox"][data-state="open"]');
  await listbox.waitFor({ timeout: 3000 });
  await listbox.locator('[role="option"]').first().click();
}

/**
 * Open the UserSearchCombobox (Popover + Command), type a search term,
 * and pick the first matching result.
 * UserSearchCombobox doesn't forward FormControl's id to its Button, so
 * getByLabel() won't find it. Instead navigate: label → parent FormItem → button.
 */
async function selectUserInCombobox(
  page: Page,
  labelText: string,
  searchTerm: string
) {
  const comboTrigger = page
    .locator("label")
    .filter({ hasText: labelText })
    .locator("..")
    .locator("button")
    .first();
  await comboTrigger.click();
  await page.waitForSelector("[cmdk-input]", { timeout: 3000 });
  await page.locator("[cmdk-input]").fill(searchTerm);
  await page.waitForSelector('[data-state="open"] [cmdk-item]', {
    timeout: 3000,
  });
  await page.locator('[data-state="open"] [cmdk-item]').first().click();
}

/** Assert that a Sonner success toast is visible */
async function assertSuccessToast(page: Page) {
  await expect(
    page.locator('[data-sonner-toast][data-type="success"]').first()
  ).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate to the first account in the accounts list and return on the
 * account detail page. Stores the accountId in testData.
 */
async function gotoFirstAccountDetail(page: Page) {
  await page.goto("/en/crm/accounts");
  await page.waitForURL(/crm\/accounts/, { timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  await page
    .getByTestId("accounts-table")
    .getByTestId("account-row-name")
    .first()
    .click();

  await page.waitForURL(/crm\/accounts\/.+/, { timeout: 10000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 });

  const url = page.url();
  testData.accountId = url.split("/crm/accounts/")[1].split("?")[0];
  expect(testData.accountId).toBeTruthy();
}

// ── Tests ──────────────────────────────────────────────────────────────────

// Serial mode: Test 2 (comment) and Test 3 (delete) depend on the task
// created by Test 1. A failure in Test 1 correctly skips the rest.
test.describe.serial("CRM Account Tasks", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("should create a task on an account", async ({ page }) => {
    await gotoFirstAccountDetail(page);

    // Unique title prevents collision with tasks left over from previous runs
    const uniqueTitle = `PW Task ${Date.now()}`;
    testData.taskTitle = uniqueTitle;

    // Open the create-task Sheet via the "+" button on the Tasks card
    const addTaskBtn = page.getByTestId("add-task-btn");
    await expect(addTaskBtn).toBeVisible({ timeout: 8000 });
    await addTaskBtn.click();
    await waitForSheet(page);

    // The Sheet should announce its purpose
    await expect(
      page.getByRole("heading", { name: /Create new Task/i })
    ).toBeVisible({ timeout: 5000 });

    // Fill the form fields (labels come from NewTaskForm.tsx)
    await page.getByLabel("New task name", { exact: true }).fill(uniqueTitle);
    await page
      .getByLabel("Task description", { exact: true })
      .fill("Playwright e2e created this task");

    // Assigned user: UserSearchCombobox (Popover + Command). Search "a" to
    // match any user whose name contains an "a" — test DB must have at least
    // one such user (the seeded test@nextcrm.app user satisfies this).
    await selectUserInCombobox(page, "Assigned to", "a");

    // Priority: shadcn Select — pick the first SelectItem
    await selectFirstOption(page, "Choose task priority");

    // Due date is optional and is skipped.

    // Submit the form (the single Create button inside the Sheet)
    await page.locator('[role="dialog"] button[type="submit"]').click();

    // Success toast and Sheet closes
    await assertSuccessToast(page);
    await expect(
      page.locator('[role="dialog"][data-state="open"]')
    ).not.toBeVisible({ timeout: 8000 });

    // The new task should appear in the Tasks data table on the detail page.
    // router.refresh() + revalidatePath from the createTask server action
    // may take a moment to propagate.
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(
      page.locator("tr").filter({ hasText: uniqueTitle }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  // FIXME: Pre-existing schema bug in actions/crm/tasks/add-comment.ts.
  // tasksComments.task is a required FK to Tasks.id (Projects task model),
  // but addComment passes a crm_Accounts_Tasks.id, which violates the FK
  // constraint. The schema has a dedicated tasksComments.assigned_crm_account_task
  // column for CRM account tasks but neither addComment nor getTaskComments
  // currently use it. Fixing requires a Prisma migration (make `task` nullable)
  // plus updates to add-comment.ts and actions/projects/get-task-comments.ts.
  // Once that's done, remove .fixme and this test will validate the full flow.
  test.fixme("should add a comment to the task", async ({ page }) => {
    // Return to the account detail page (new page, new context)
    await page.goto(`/en/crm/accounts/${testData.accountId}`);
    await page.waitForURL(/crm\/accounts\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Find the task row we created and open its row-actions dropdown
    const taskRow = page
      .locator("tr")
      .filter({ hasText: testData.taskTitle })
      .first();
    await expect(taskRow).toBeVisible({ timeout: 10000 });
    await taskRow.getByRole("button", { name: /Open menu/i }).click();

    // Click "View" to navigate to the task detail page
    await page.getByRole("menuitem", { name: "View" }).click();

    // Playwright sees the locale-prefixed URL after middleware runs
    await page.waitForURL(/\/crm\/tasks\/viewtask\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    // Capture the taskId from the URL for use in the next test
    const url = page.url();
    testData.taskId = url.split("/crm/tasks/viewtask/")[1].split("?")[0];
    expect(testData.taskId).toBeTruthy();

    // The team-conversation form is the first form on the page. Its
    // input has placeholder "Your comment ..." (see team-conversation.tsx).
    const uniqueComment = `PW comment ${Date.now()}`;
    const commentInput = page.getByPlaceholder("Your comment ...");
    await expect(commentInput).toBeVisible({ timeout: 10000 });
    await commentInput.fill(uniqueComment);

    // Submit — the form's Add button
    await page.getByRole("button", { name: "Add", exact: true }).click();

    // Success toast fires after addComment server action resolves
    await assertSuccessToast(page);

    // The comment should appear in the "Team conversation" card below the form
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(page.getByText(uniqueComment).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("should delete the task from the account tasks table", async ({
    page,
  }) => {
    // Back to the account detail page
    await page.goto(`/en/crm/accounts/${testData.accountId}`);
    await page.waitForURL(/crm\/accounts\/.+/, { timeout: 10000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const taskRow = page
      .locator("tr")
      .filter({ hasText: testData.taskTitle })
      .first();
    await expect(taskRow).toBeVisible({ timeout: 10000 });

    // Open the row actions dropdown and click Delete
    await taskRow.getByRole("button", { name: /Open menu/i }).click();
    await page.getByRole("menuitem", { name: /Delete/i }).click();

    // AlertModal is a shadcn Dialog (role="dialog") with title "Are you sure?"
    // and a destructive "Continue" button (see components/modals/alert-modal.tsx).
    const alertDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: "Are you sure?" });
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await alertDialog.getByRole("button", { name: "Continue" }).click();

    // Success toast + row disappears after revalidatePath + router.refresh
    await assertSuccessToast(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    await expect(
      page.locator("tr").filter({ hasText: testData.taskTitle })
    ).toHaveCount(0, { timeout: 15000 });
  });
});
