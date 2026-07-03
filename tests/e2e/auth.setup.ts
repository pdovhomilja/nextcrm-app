import { test as setup } from "@playwright/test";
import { getOtp, injectCookie, requestOtp, verifyOtp } from "./helpers/api";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const AUTH_FILE = process.env.AUTH_FILE ?? "tests/e2e/.auth/user.json";

const email = process.env.TEST_USER_EMAIL ?? "admin@example.com";

setup("authenticate via OTP", async ({ page }) => {
  await requestOtp(email);
  const otp = await getOtp(email);
  const cookie = await verifyOtp(email, otp);
  await injectCookie(page, cookie);

  await page.goto(`${BASE_URL}/en`, { waitUntil: "domcontentloaded" });
  await page.context().storageState({ path: AUTH_FILE });
});
