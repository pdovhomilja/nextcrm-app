/** @jest-environment node */

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
}));

jest.mock("@/lib/llm", () => ({
  completeChatWorkflow: jest.fn(),
  parseJsonObject: jest.fn(),
  refineCampaignEmailJson: jest.fn(),
}));

jest.mock("@/lib/llm/availability", () => ({
  getConfiguredLlmProviders: jest.fn().mockResolvedValue(["openrouter"]),
}));

import { requireAuthenticated } from "@/lib/authz";
import { completeChatWorkflow, parseJsonObject, refineCampaignEmailJson } from "@/lib/llm";
import { generateComposeEmail } from "@/actions/emails/generate-compose-email";

describe("generateComposeEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "u1" });
    (refineCampaignEmailJson as jest.Mock).mockResolvedValue(null);
  });

  it("rejects empty draft prompt", async () => {
    const res = await generateComposeEmail({ prompt: "  " });
    expect(res).toEqual({ ok: false, error: "Describe what you want to write." });
    expect(completeChatWorkflow).not.toHaveBeenCalled();
  });

  it("returns subject and html on success", async () => {
    (completeChatWorkflow as jest.Mock).mockResolvedValue({
      content: '{"subject":"Hi","html":"<p>Hello</p>"}',
      provider: "groq",
      stages: [],
    });
    (parseJsonObject as jest.Mock).mockReturnValue({
      subject: "Hi",
      html: "<p>Hello</p>",
    });

    const res = await generateComposeEmail({
      prompt: "Say hello",
      mode: "new",
    });

    expect(res).toEqual({ ok: true, subject: "Hi", html: "<p>Hello</p>" });
    expect(completeChatWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ task: "quick-copy", userId: "u1" })
    );
  });
});
