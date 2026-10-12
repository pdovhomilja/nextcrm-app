jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { users: { findMany: jest.fn() } },
}));
const mockSend = jest.fn();
jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(async () => ({ emails: { send: mockSend } })),
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { sendFeedback } from "@/actions/feedback/send-feedback";

const mockGetSession = getSession as jest.Mock;
const mockFindMany = prismadb.users.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ user: { id: "u1" } });
  mockSend.mockResolvedValue({ id: "mail-1" });
});

describe("sendFeedback recipients", () => {
  it("sends to the active admins of the instance", async () => {
    mockFindMany.mockResolvedValue([
      { email: "admin1@example.com" },
      { email: "admin2@example.com" },
    ]);

    const result = await sendFeedback({ feedback: "Great app" });

    expect(result).toEqual({ success: true });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { role: "admin", userStatus: "ACTIVE" },
      select: { email: true },
    });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin1@example.com", "admin2@example.com"],
        text: "Great app",
      })
    );
  });

  it("sends nothing when the instance has no active admin", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await sendFeedback({ feedback: "Hello" });

    expect(result).toEqual({ error: "No active admin to receive feedback" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers without querying admins", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await sendFeedback({ feedback: "Hello" });

    expect(result).toEqual({ error: "Unauthorized" });
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
