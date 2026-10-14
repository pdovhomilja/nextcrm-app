jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/llm", () => ({
  completeChatWorkflow: jest.fn(),
  parseJsonObject: jest.fn(),
  refineCampaignEmailJson: jest.fn(),
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { completeChatWorkflow, parseJsonObject, refineCampaignEmailJson } from "@/lib/llm";
import { generateTemplate } from "@/actions/campaigns/templates/generate-template";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("generateTemplate scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (completeChatWorkflow as jest.Mock).mockResolvedValue({
      content: JSON.stringify({ subject: "S", html: "<p>H</p>" }),
      provider: "openrouter",
      model: "test",
      stages: ["draft:openrouter/test"],
    });
    (parseJsonObject as jest.Mock).mockReturnValue({ subject: "S", html: "<p>H</p>" });
    (refineCampaignEmailJson as jest.Mock).mockResolvedValue(null);
  });

  it("unauthenticated throws Unauthorized and never calls LLM", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await generateTemplate("p");
    expect(res.ok).toBe(false);
    expect(completeChatWorkflow).not.toHaveBeenCalled();
  });

  it("user generates template via LLM router", async () => {
    mockUser("user", "u1");
    const res = await generateTemplate("write a welcome");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.subject).toBe("S");
    expect(res.html).toBe("<p>H</p>");
    expect(completeChatWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ task: "campaign-email", userId: "u1" })
    );
  });

  it("manager generates template", async () => {
    mockUser("manager", "m1");
    const res = await generateTemplate("p");
    expect(res.ok).toBe(true);
    expect(completeChatWorkflow).toHaveBeenCalledWith(expect.objectContaining({ userId: "m1" }));
  });

  it("admin generates template", async () => {
    mockUser("admin", "a1");
    const res = await generateTemplate("p");
    expect(res.ok).toBe(true);
    expect(completeChatWorkflow).toHaveBeenCalledWith(expect.objectContaining({ userId: "a1" }));
  });
});
