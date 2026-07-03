import type { Page } from "@playwright/test";
import { signInViaApi } from "../helpers/api";

const adminEmail = process.env.TEST_USER_EMAIL ?? "admin@example.com";
const managerEmail = "manager@example.com";
const userEmail = "user@example.com";

export async function loginAsAdmin(page: Page): Promise<void> {
  await signInViaApi(page, adminEmail);
}

export async function loginAsManager(page: Page): Promise<void> {
  await signInViaApi(page, managerEmail);
}

export async function loginAsUser(page: Page): Promise<void> {
  await signInViaApi(page, userEmail);
}

export async function loginAs(page: Page, role: "admin" | "manager" | "user"): Promise<void> {
  switch (role) {
    case "admin":
      await loginAsAdmin(page);
      break;
    case "manager":
      await loginAsManager(page);
      break;
    case "user":
      await loginAsUser(page);
      break;
  }
}
