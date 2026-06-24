import { vi } from "vitest";

export const sendmailSpy = vi.fn().mockResolvedValue({ ok: true });
