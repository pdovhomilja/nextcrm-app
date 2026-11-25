jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((_config: unknown, handler: unknown) => handler) },
}));
jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Target_Enrichment: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    crm_Targets: { findUnique: jest.fn(), update: jest.fn() },
    crm_Target_Contact: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
  },
}));
const run = jest.fn();
jest.mock("e2b", () => ({
  Sandbox: { create: jest.fn(async () => ({ files: { write: jest.fn() }, commands: { run }, kill: jest.fn(async () => {}) })) },
}));

import { prismadb } from "@/lib/prisma";
import { getApiKey } from "@/lib/api-keys";
import { enrichTarget } from "@/inngest/functions/enrich-target";
import { enrichTargetContact } from "@/inngest/functions/enrich-target-contact";

type Handler = (ctx: { event: { data: Record<string, unknown> }; step: unknown }) => Promise<unknown>;
const KEY = "sk-test-model-key";

// Like Inngest: step results are stored as JSON.
const fakeStep = () => {
  const results: string[] = [];
  return {
    results,
    run: async (_id: string, fn: () => unknown) => {
      const out = await fn();
      const stored = out === undefined ? undefined : JSON.stringify(out);
      if (stored !== undefined) results.push(stored);
      return stored === undefined ? undefined : JSON.parse(stored);
    },
    sendEvent: jest.fn(),
  };
};
const agentSays = (output: unknown) => run.mockResolvedValue({ exitCode: 0, stdout: JSON.stringify(output), stderr: "" });
const person = (i: number, over: Record<string, unknown> = {}) =>
  ({ name: `Person ${i}`, email: null, title: null, linkedinUrl: `https://www.linkedin.com/in/p${i}`, phone: null, source: "enriched", ...over });

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;

beforeEach(() => {
  jest.clearAllMocks();
  (getApiKey as jest.Mock).mockResolvedValue(KEY);
  db.crm_Target_Enrichment.findFirst.mockResolvedValue(null);
  db.crm_Targets.findUnique.mockResolvedValue({ id: "t1", company: "Acme", email: "a@acme.example", company_website: null });
  db.crm_Target_Contact.findUnique.mockResolvedValue({
    id: "c1", name: "Jana Novak", email: "jana@acme.example", title: null, linkedinUrl: null, phone: null,
    target: { company: "Acme", company_website: null, email: null },
  });
  db.crm_Target_Contact.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({ id: `id-${create.linkedinUrl}`, ...create }));
  agentSays({ target: {}, contacts: [], confidence: {} });
});

describe("enrichment jobs keep the model key out of step state", () => {
  it.each([
    ["target", () => (enrichTarget as unknown as Handler)({ event: { data: { targetId: "t1", enrichmentId: "e1", triggeredBy: "u1" } }, step: s })],
    ["contact", () => (enrichTargetContact as unknown as Handler)({ event: { data: { contactId: "c1", triggeredBy: "u1" } }, step: s })],
  ])("%s job", async (_label, start) => {
    s = fakeStep();
    await start();
    expect(run).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ envs: expect.objectContaining({ ANTHROPIC_API_KEY: KEY }) }));
    expect(s.results.join("\n")).not.toContain(KEY);
  });
});
let s = fakeStep();

describe("enrich-target applies agent output within limits", () => {
  const runTarget = () => (enrichTarget as unknown as Handler)({ event: { data: { targetId: "t1", enrichmentId: "e1", triggeredBy: "u1" } }, step: s });

  it("enriches at most 10 contacts per run", async () => {
    s = fakeStep();
    agentSays({ target: {}, contacts: Array.from({ length: 30 }, (_, i) => person(i)), confidence: {} });
    await runTarget();
    expect(db.crm_Target_Contact.upsert).toHaveBeenCalledTimes(10);
    expect(s.sendEvent.mock.calls[0][1]).toHaveLength(10);
  });

  it("fills only empty fields of a contact that already exists", async () => {
    s = fakeStep();
    db.crm_Target_Contact.upsert.mockResolvedValue({ id: "c9", name: "Jana Novak", title: "Head of Sales", linkedinUrl: "https://www.linkedin.com/in/p1", enrichStatus: "PENDING" });
    agentSays({ target: {}, contacts: [person(1, { name: "Someone Else", title: "CEO" })], confidence: {} });
    await runTarget();
    expect(db.crm_Target_Contact.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ name: expect.anything() }) }));
    expect(db.crm_Target_Contact.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: expect.anything() }) }));
    expect(db.crm_Target_Contact.update).toHaveBeenCalledWith({ where: { id: "c9" }, data: expect.objectContaining({ enrichStatus: "COMPLETED" }) });
    expect(s.sendEvent).not.toHaveBeenCalled();
  });

  it("does not store a link that is not https", async () => {
    s = fakeStep();
    agentSays({ target: { social_linkedin: "javascript:alert(1)" }, contacts: [], confidence: {} });
    await runTarget();
    expect(db.crm_Targets.update).not.toHaveBeenCalled();
  });
});
