import { expect, type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly sendOtpButton: Locator;
  readonly otpInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.sendOtpButton = page.locator("button:has-text('Send'), button:has-text('OTP')").first();
    this.otpInput = page.locator("input[name='otp'], input[placeholder*='OTP'], input[placeholder*='code']").first();
    this.verifyButton = page.locator("button:has-text('Verify'), button:has-text('Sign in')").first();
  }

  async open(): Promise<void> {
    await this.page.goto("/en/sign-in");
    await this.emailInput.waitFor({ state: "visible", timeout: 10_000 });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async clickSendOtp(): Promise<void> {
    await this.sendOtpButton.click();
  }

  async fillOtp(otp: string): Promise<void> {
    await this.otpInput.fill(otp);
  }

  async clickVerify(): Promise<void> {
    await this.verifyButton.click();
  }

  async expectRedirectedFromSignIn(): Promise<void> {
    await expect(this.page).not.toHaveURL(/sign-in/, { timeout: 10_000 });
  }
}
