// The two NEXTCRM_TOKEN routes accept only the configured token.
jest.mock("@/lib/prisma", () => ({ prismadb: { crm_Contacts: { create: jest.fn(async () => ({})) } } }));
jest.mock("@/lib/crm/leads/service", () => ({ createWebLead: jest.fn(async () => ({})) }));

import { POST as createLead } from "@/app/api/crm/leads/create-lead-from-web/route";
import { POST as createContact } from "@/app/api/crm/contacts/create-from-remote/route";
import { createWebLead } from "@/lib/crm/leads/service";
import { prismadb } from "@/lib/prisma";
import { safeEqual } from "@/lib/safe-equal";

const lead = (token: string) =>
  createLead(new Request("http://x/api", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: token },
    body: JSON.stringify({ lastName: "L" }),
  }));
const contact = (token: string) =>
  createContact(new Request("http://x/api", {
    method: "POST",
    headers: { NEXTCRM_TOKEN: token },
    body: JSON.stringify({ name: "n", surname: "s", email: "e@x.cz", phone: "1", company: "c", message: "m", tag: "t" }),
  }));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXTCRM_TOKEN = "right-token";
});

it.each(["wrong-token", "right-toke", "right-token-and-more"])("refuses the token %s", async (t) => {
  expect((await lead(t)).status).toBe(401);
  expect((await contact(t)).status).toBe(403);
  expect(createWebLead).not.toHaveBeenCalled();
  expect(prismadb.crm_Contacts.create).not.toHaveBeenCalled();
});

it("accepts the configured token", async () => {
  expect((await lead(" right-token ")).status).toBe(200);
  expect((await contact("right-token")).status).toBe(200);
});

it("create-from-remote refuses every token when none is configured", async () => {
  delete process.env.NEXTCRM_TOKEN;
  expect((await contact("undefined")).status).toBe(403);
});

it("safeEqual compares strings of any length", () => {
  expect(safeEqual("abc", "abc")).toBe(true);
  expect(safeEqual("abc", "abd")).toBe(false);
  expect(safeEqual("abc", "abcd")).toBe(false);
  expect(safeEqual("", "")).toBe(true);
});
