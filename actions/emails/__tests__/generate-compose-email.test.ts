/** @jest-environment node */

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
}));

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: {
      findUnique: jest.fn().mockResolvedValue({
        id: "u1",
        name: "Akhil Kumar",
        account_name: "VenSai Labs",
        role: "admin",
      }),
    },
    emailAccount: {
      findFirst: jest.fn().mockResolvedValue({
        fromName: "Akhil Kumar",
        label: "Primary",
      }),
    },
    crm_Contacts: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    crm_Leads: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  },
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
import { prismadb } from "@/lib/prisma";
import { completeChatWorkflow, parseJsonObject, refineCampaignEmailJson } from "@/lib/llm";
import { generateComposeEmail } from "@/actions/emails/generate-compose-email";

describe("generateComposeEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "u1" });
    (refineCampaignEmailJson as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue(null);
    (prismadb.crm_Leads.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it("rejects empty draft prompt when no existing draft is present", async () => {
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
    // Never calls marketing campaign refinement
    expect(refineCampaignEmailJson).not.toHaveBeenCalled();
  });

  it("grounds recipient and sender context when contact exists in CRM", async () => {
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue({
      first_name: "Sarah",
      last_name: "Connor",
      position: "VP of Engineering",
      assigned_accounts: {
        name: "Cyberdyne Systems",
        type: "Customer",
        status: "Active",
      },
      opportunities: [{ opportunity: { name: "Enterprise Upgrade 2026" } }],
    });

    (completeChatWorkflow as jest.Mock).mockResolvedValue({
      content: '{"subject":"Proposal Follow-up","html":"<p>Hi Sarah,</p>"}',
      provider: "groq",
      stages: [],
    });

    await generateComposeEmail({
      to: "sarah@cyberdyne.com",
      prompt: "Follow up on proposal",
      mode: "new",
    });

    expect(prismadb.crm_Contacts.findFirst).toHaveBeenCalled();
    const workflowCall = (completeChatWorkflow as jest.Mock).mock.calls[0][0];
    const userPrompt = workflowCall.messages.find((m: any) => m.role === "user").content;

    // Check sender grounding
    expect(userPrompt).toContain("Name: Akhil Kumar");
    expect(userPrompt).toContain("Company: VenSai Labs");

    // Check recipient grounding
    expect(userPrompt).toContain("Name: Sarah Connor");
    expect(userPrompt).toContain("Title: VP of Engineering");
    expect(userPrompt).toContain("Company: Cyberdyne Systems");
    expect(userPrompt).toContain("Relationship status: Customer, Active");
    expect(userPrompt).toContain("Active opportunity: Enterprise Upgrade 2026");
  });

  it("preserves existing editor content when action is draft or quick action", async () => {
    (completeChatWorkflow as jest.Mock).mockResolvedValue({
      content: '{"subject":"Follow-up","html":"<p>Updated content</p>"}',
      provider: "groq",
      stages: [],
    });

    await generateComposeEmail({
      prompt: "Make it more concise",
      action: "draft",
      existingBodyPlain: "Hi John, following up on our meeting yesterday regarding the proposal.",
    });

    const workflowCall = (completeChatWorkflow as jest.Mock).mock.calls[0][0];
    const userPrompt = workflowCall.messages.find((m: any) => m.role === "user").content;

    expect(userPrompt).toContain("[EXISTING DRAFT IN EDITOR]");
    expect(userPrompt).toContain("following up on our meeting yesterday regarding the proposal");
    expect(userPrompt).toContain("strictly preserving the key facts and intent");
  });

  it("never invokes marketing campaign refinement prompt on best quality mode", async () => {
    (completeChatWorkflow as jest.Mock).mockResolvedValue({
      content: '{"subject":"Executive update","html":"<p>Hi Alex,</p>"}',
      provider: "gemini",
      stages: [],
    });

    await generateComposeEmail({
      prompt: "Executive status update",
      qualityMode: "best",
    });

    expect(refineCampaignEmailJson).not.toHaveBeenCalled();
  });
});
