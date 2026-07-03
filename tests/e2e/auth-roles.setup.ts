import { chromium, test as setup } from "@playwright/test";
import { getOtp, injectCookie, requestOtp, verifyOtp } from "./helpers/api";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

const adminEmail = process.env.TEST_USER_EMAIL ?? "admin@example.com";
const managerEmail = process.env.MANAGER_USER_EMAIL ?? "manager@example.com";
const userEmail = process.env.TEST_USER_EMAIL_USER ?? "user@example.com";

async function authenticateAndSave(email: string, authFile: string): Promise<void> {
  await requestOtp(email);
  const otp = await getOtp(email);
  const cookie = await verifyOtp(email, otp);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await injectCookie(page, cookie);
  await page.goto(`${BASE_URL}/en`, { waitUntil: "domcontentloaded" });
  await context.storageState({ path: authFile });
  await browser.close();
}

setup("authenticate all roles", async () => {
  await authenticateAndSave(adminEmail, "tests/.auth/admin.json");
  await authenticateAndSave(managerEmail, "tests/.auth/manager.json");
  await authenticateAndSave(userEmail, "tests/.auth/user-role.json");
});
