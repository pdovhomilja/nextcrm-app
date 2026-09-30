jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTarget: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Targets: { findFirst: jest.fn() } },
}));

import { requireAuthenticated, assertCanWriteTarget, AuthorizationError } from "@/lib/authz";
import { getApiKey } from "@/lib/api-keys";
import { prismadb } from "@/lib/prisma";
import { generateTargetEmail } from "@/actions/crm/targets/generate-target-email";

const authed = requireAuthenticated as jest.Mock;
const assertT = assertCanWriteTarget as jest.Mock;
const key = getApiKey as jest.Mock;
const findFirst = prismadb.crm_Targets.findFirst as jest.Mock;
const ME = { id: "me", role: "user" };
const APPROVED = { id: "t1", triage_status: "APPROVED", company: "Acme", description: "Old site" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(ME);
  assertT.mockResolvedValue(undefined);
  key.mockResolvedValue("sk-ant-test");
  findFirst.mockResolvedValue(APPROVED);
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ type: "text", text: JSON.stringify({ subject: "Hi Acme", html: "<p>Pitch</p>" }) }] }),
  }) as unknown as typeof fetch;
});

it("returns subject + body_html for an approved target", async () => {
  const res = await generateTargetEmail({ targetId: "t1", prompt: "Be warm" });
  expect(res).toEqual({ data: { subject: "Hi Acme", body_html: "<p>Pitch</p>" } });
});

it("refuses a non-approved target", async () => {
  findFirst.mockResolvedValue({ ...APPROVED, triage_status: "NEW" });
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ error: "Target must be approved before generating outreach" });
  expect(global.fetch).not.toHaveBeenCalled();
});

it("returns Forbidden for a non-owner", async () => {
  assertT.mockRejectedValue(new AuthorizationError());
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ error: "Forbidden" });
});

it("handles a malformed AI response without throwing", async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ content: [{ type: "text", text: "not json" }] }),
  });
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ error: "AI returned an unexpected response. Please try again." });
});

const aiText = (text: string) => ({
  ok: true,
  json: async () => ({ content: [{ type: "text", text }] }),
});

it("parses JSON wrapped in a markdown code fence", async () => {
  (global.fetch as jest.Mock).mockResolvedValue(
    aiText('```json\n{"subject":"Hi Acme","html":"<p>Pitch</p>"}\n```'),
  );
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ data: { subject: "Hi Acme", body_html: "<p>Pitch</p>" } });
});

it("parses JSON preceded by a preamble", async () => {
  (global.fetch as jest.Mock).mockResolvedValue(
    aiText('Here is the email:\n{"subject":"Hi Acme","html":"<p>Pitch</p>"}'),
  );
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ data: { subject: "Hi Acme", body_html: "<p>Pitch</p>" } });
});

it("picks the text block when a non-text block comes first", async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      content: [
        { type: "thinking", thinking: "hmm" },
        { type: "text", text: JSON.stringify({ subject: "Hi Acme", html: "<p>Pitch</p>" }) },
      ],
    }),
  });
  const res = await generateTargetEmail({ targetId: "t1", prompt: "x" });
  expect(res).toEqual({ data: { subject: "Hi Acme", body_html: "<p>Pitch</p>" } });
});
