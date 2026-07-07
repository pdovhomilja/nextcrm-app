import { test as base } from "@playwright/test";
import { loginAsAdmin } from "../flows/auth";

type Fixtures = {
  adminPage: import("@playwright/test").Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
