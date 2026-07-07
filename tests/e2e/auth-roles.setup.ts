import fs from "node:fs";
import path from "node:path";
import { chromium, test as setup } from "@playwright/test";
import { getOtp, injectCookie, requestOtp, verifyOtp } from "./helpers/api";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

const managerEmail = process.env.MANAGER_USER_EMAIL ?? "manager@example.com";
const userEmail = process.env.TEST_USER_EMAIL_USER ?? "user@example.com";

const AUTH_DIR = path.resolve(__dirname, "../../tests/.auth");
const SETUP_AUTH = path.resolve(__dirname, ".auth/user.json");

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
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  if (fs.existsSync(SETUP_AUTH)) {
    fs.copyFileSync(SETUP_AUTH, path.join(AUTH_DIR, "admin.json"));
  }

  await authenticateAndSave(managerEmail, path.join(AUTH_DIR, "manager.json"));
  await authenticateAndSave(userEmail, path.join(AUTH_DIR, "user-role.json"));
});
