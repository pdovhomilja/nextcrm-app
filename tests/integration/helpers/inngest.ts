import { vi } from "vitest";

export const inngestSpy = { send: vi.fn().mockResolvedValue({ ids: [] }) };
