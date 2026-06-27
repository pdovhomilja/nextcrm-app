import { vi } from "vitest";
import { inngestSpy } from "./inngest";
import { sendmailSpy } from "./sendmail";

const headersImpl = vi.fn<() => Promise<Headers>>();
const cookiesGetImpl = vi.fn<(name: string) => { name: string; value: string } | undefined>();
const cookiesApi = {
  get: (name: string) => cookiesGetImpl(name),
};

export function setSessionCookie(cookie: string): void {
  headersImpl.mockResolvedValue(new Headers({ cookie }));
  cookiesGetImpl.mockImplementation((name: string) =>
    name === "better-auth.session_token" || name === "session" ? { name, value: cookie } : undefined,
  );
}

export function registerIntegrationMocks(): void {
  vi.mock("next/headers", () => ({
    headers: headersImpl,
    cookies: vi.fn().mockResolvedValue(cookiesApi),
  }));
  vi.mock("next/navigation", () => ({
    redirect: vi.fn(),
    notFound: vi.fn(),
  }));
  vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
  }));
  vi.mock("@/inngest/client", () => ({ inngest: inngestSpy }));
  vi.mock("@/lib/sendmail", () => ({ default: sendmailSpy }));
}
