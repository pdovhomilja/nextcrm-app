import { type BrowserContext, test as base, type Page } from "@playwright/test";

type RoleFixtures = {
  adminPage: Page;
  managerPage: Page;
  userPage: Page;
  adminContext: BrowserContext;
  managerContext: BrowserContext;
  userContext: BrowserContext;
};

export const test = base.extend<RoleFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "tests/.auth/admin.json" });
    await use(context);
    await context.close();
  },
  managerContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "tests/.auth/manager.json" });
    await use(context);
    await context.close();
  },
  userContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "tests/.auth/user-role.json" });
    await use(context);
    await context.close();
  },
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
    await page.close();
  },
  managerPage: async ({ managerContext }, use) => {
    const page = await managerContext.newPage();
    await use(page);
    await page.close();
  },
  userPage: async ({ userContext }, use) => {
    const page = await userContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from "@playwright/test";
