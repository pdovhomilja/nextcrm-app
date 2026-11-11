// Every return path of the four lead actions: auth, success with its
// revalidations, LeadError, plugin rule, unknown error. Pins the results so
// the shared wrapper can't change what a caller sees.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
}));
jest.mock("@/lib/crm/leads/service", () => ({
  createLead: jest.fn(),
  updateLead: jest.fn(),
  deleteLead: jest.fn(),
  restoreLead: jest.fn(),
}));
jest.mock("@/lib/plugins/action-errors", () => ({
  pluginRuleErrorMessage: async (e: Error) => (e.message === "rule" ? "Blocked by rule" : null),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import * as svc from "@/lib/crm/leads/service";
import { LeadError } from "@/lib/crm/leads/types";
import { revalidatePath } from "next/cache";
import { createLead } from "@/actions/crm/leads/create-lead";
import { updateLead } from "@/actions/crm/leads/update-lead";
import { deleteLead } from "@/actions/crm/leads/delete-lead";
import { restoreLead } from "@/actions/crm/leads/restore-lead";

const authed = requireAuthenticated as jest.Mock;
const revalidate = revalidatePath as jest.Mock;
const USER = { id: "u-1", role: "admin" };
const LEAD = { id: "l-1" };
const LEADS_PAGE = ["/[locale]/(routes)/crm/leads", "page"];
const AUDIT_PAGE = ["/[locale]/(routes)/admin/audit-log", "page"];

type Case = {
  name: string;
  call: () => Promise<unknown>;
  service: jest.Mock;
  authArgs: unknown[];
  success: unknown;
  revalidations: unknown[][];
  ruleResult: unknown;
  failed: string;
  logTag: string;
};

const cases: Case[] = [
  {
    name: "createLead",
    call: () => createLead({ last_name: "Doe" }),
    service: svc.createLead as jest.Mock,
    authArgs: [{ partner: true }],
    success: { data: LEAD },
    revalidations: [LEADS_PAGE],
    ruleResult: { error: "Blocked by rule" },
    failed: "Failed to create lead",
    logTag: "[CREATE_LEAD]",
  },
  {
    name: "updateLead",
    call: () => updateLead({ id: "l-1", lastName: "Doe" }),
    service: svc.updateLead as jest.Mock,
    authArgs: [{ partner: true }],
    success: { data: LEAD },
    revalidations: [LEADS_PAGE],
    ruleResult: { error: "Blocked by rule" },
    failed: "Failed to update lead",
    logTag: "[UPDATE_LEAD]",
  },
  {
    name: "deleteLead",
    call: () => deleteLead("l-1"),
    service: svc.deleteLead as jest.Mock,
    authArgs: [],
    success: { success: true },
    revalidations: [LEADS_PAGE],
    ruleResult: { error: "Blocked by rule" },
    failed: "Failed to delete lead",
    logTag: "[DELETE_LEAD]",
  },
  {
    name: "restoreLead",
    call: () => restoreLead("l-1"),
    service: svc.restoreLead as jest.Mock,
    authArgs: [],
    success: { success: true },
    revalidations: [LEADS_PAGE, AUDIT_PAGE],
    // restoreLead never mapped plugin rule errors.
    ruleResult: { error: "Failed to restore lead" },
    failed: "Failed to restore lead",
    logTag: "[RESTORE_LEAD]",
  },
];

let log: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(USER);
  log = jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => log.mockRestore());

describe.each(cases)("$name", (c) => {
  it("returns Unauthorized when not signed in, without calling the service", async () => {
    authed.mockRejectedValue(new AuthenticationError());
    await expect(c.call()).resolves.toEqual({ error: "Unauthorized" });
    expect(c.service).not.toHaveBeenCalled();
  });

  it("rethrows other auth failures", async () => {
    authed.mockRejectedValue(new Error("db down"));
    await expect(c.call()).rejects.toThrow("db down");
  });

  it("returns the success result and revalidates in order", async () => {
    c.service.mockResolvedValue(LEAD);
    await expect(c.call()).resolves.toEqual(c.success);
    expect(authed.mock.calls).toEqual([c.authArgs]);
    expect(revalidate.mock.calls).toEqual(c.revalidations);
  });

  it("maps LeadError notFound and forbidden, without revalidating", async () => {
    c.service.mockRejectedValueOnce(new LeadError("notFound", "Lead status"));
    await expect(c.call()).resolves.toEqual({ error: "Lead status not found" });
    c.service.mockRejectedValueOnce(new LeadError("forbidden"));
    await expect(c.call()).resolves.toEqual({ error: "Forbidden" });
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("handles a plugin rule rejection", async () => {
    c.service.mockRejectedValue(new Error("rule"));
    await expect(c.call()).resolves.toEqual(c.ruleResult);
  });

  it("logs an unknown error and returns the generic failure", async () => {
    const err = new Error("boom");
    c.service.mockRejectedValue(err);
    await expect(c.call()).resolves.toEqual({ error: c.failed });
    expect(log).toHaveBeenCalledWith(c.logTag, err);
    expect(revalidate).not.toHaveBeenCalled();
  });
});

it("updateLead, deleteLead and restoreLead refuse a missing id before auth", async () => {
  await expect(updateLead({ id: "", lastName: "Doe" })).resolves.toEqual({ error: "id is required" });
  await expect(deleteLead("")).resolves.toEqual({ error: "leadId is required" });
  await expect(restoreLead("")).resolves.toEqual({ error: "leadId is required" });
  expect(authed).not.toHaveBeenCalled();
});
