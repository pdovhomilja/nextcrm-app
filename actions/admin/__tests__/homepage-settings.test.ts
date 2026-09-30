jest.mock("@/lib/authz", () => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return { requireRole: jest.fn(), AuthenticationError, AuthorizationError };
});
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Ai_Prompt: { findFirst: jest.fn(), findMany: jest.fn() },
    crm_SystemSettings: { upsert: jest.fn(), findMany: jest.fn() },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import {
  getHomepageSettingsForAdmin,
  saveHomepageSettings,
} from "../homepage-settings";

const requireRoleMock = requireRole as jest.Mock;
const upsert = prismadb.crm_SystemSettings.upsert as jest.Mock;
const settingsFindMany = prismadb.crm_SystemSettings.findMany as jest.Mock;
const promptFindFirst = prismadb.crm_Ai_Prompt.findFirst as jest.Mock;
const promptFindMany = prismadb.crm_Ai_Prompt.findMany as jest.Mock;

const asAdmin = () => requireRoleMock.mockResolvedValue({ id: "admin-1" });

beforeEach(() => {
  jest.resetAllMocks();
  upsert.mockResolvedValue({});
});

describe("saveHomepageSettings", () => {
  it("returns Forbidden for a non-admin, with no writes", async () => {
    requireRoleMock.mockRejectedValue(new AuthorizationError("no"));
    const res = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: null,
    });
    expect(res).toEqual({ error: "Forbidden" });
    expect(upsert).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("returns Unauthorized when unauthenticated", async () => {
    requireRoleMock.mockRejectedValue(new AuthenticationError("no"));
    const res = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: null,
    });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("requires the admin role", async () => {
    asAdmin();
    await saveHomepageSettings({ model: "claude-sonnet-5-5", maxTokens: 20000, basePromptId: null });
    expect(requireRoleMock).toHaveBeenCalledWith(["admin"]);
  });

  it("persists the default model when given an unknown one", async () => {
    asAdmin();
    const res = await saveHomepageSettings({ model: "gpt-4", maxTokens: 20000, basePromptId: null });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "homepage.model" },
      create: { key: "homepage.model", value: "claude-sonnet-5-5" },
      update: { value: "claude-sonnet-5-5" },
    });
    expect(res).toEqual({ data: { model: "claude-sonnet-5-5", maxTokens: 20000, basePromptId: null } });
  });

  it("clamps maxTokens to the floor", async () => {
    asAdmin();
    const res = await saveHomepageSettings({ model: "claude-sonnet-5-5", maxTokens: 999, basePromptId: null });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "homepage.max_tokens" },
      create: { key: "homepage.max_tokens", value: "4000" },
      update: { value: "4000" },
    });
    expect(res).toEqual({ data: { model: "claude-sonnet-5-5", maxTokens: 4000, basePromptId: null } });
  });

  it("rejects an unknown base prompt with no writes", async () => {
    asAdmin();
    promptFindFirst.mockResolvedValue(null);
    const res = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: "nope",
    });
    expect(res).toEqual({ error: expect.stringMatching(/not found/) });
    expect(promptFindFirst).toHaveBeenCalledWith({
      where: { id: "nope", kind: "HOMEPAGE_BASE", deletedAt: null },
      select: { id: true },
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("saves all three keys, audits, and returns the data (happy path)", async () => {
    asAdmin();
    promptFindFirst.mockResolvedValue({ id: "p1" });
    const res = await saveHomepageSettings({
      model: "claude-opus-5-5",
      maxTokens: 30000,
      basePromptId: "p1",
    });
    const keys = upsert.mock.calls.map((c) => [c[0].where.key, c[0].update.value]);
    expect(keys).toEqual([
      ["homepage.model", "claude-opus-5-5"],
      ["homepage.max_tokens", "30000"],
      ["homepage.base_prompt_id", "p1"],
    ]);
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "setting",
        // crm_AuditLog.entityId is a UUID column; a non-UUID is silently dropped.
        entityId: "00000000-0000-4000-8000-0000000000c0",
        action: "updated",
        userId: "admin-1",
      }),
    );
    expect(res).toEqual({ data: { model: "claude-opus-5-5", maxTokens: 30000, basePromptId: "p1" } });
  });

  it("stores an empty string when basePromptId is null", async () => {
    asAdmin();
    await saveHomepageSettings({ model: "claude-sonnet-5-5", maxTokens: 20000, basePromptId: null });
    expect(promptFindFirst).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "homepage.base_prompt_id" },
      create: { key: "homepage.base_prompt_id", value: "" },
      update: { value: "" },
    });
  });
});

describe("getHomepageSettingsForAdmin", () => {
  it("returns Forbidden for a non-admin", async () => {
    requireRoleMock.mockRejectedValue(new AuthorizationError("no"));
    expect(await getHomepageSettingsForAdmin()).toEqual({ error: "Forbidden" });
    expect(promptFindMany).not.toHaveBeenCalled();
  });

  it("returns settings plus base prompts for an admin", async () => {
    asAdmin();
    settingsFindMany.mockResolvedValue([
      { key: "homepage.model", value: "claude-opus-5-5" },
      { key: "homepage.max_tokens", value: "20000" },
      { key: "homepage.base_prompt_id", value: "p1" },
    ]);
    promptFindMany.mockResolvedValue([{ id: "p1", name: "Premium" }]);
    const res = await getHomepageSettingsForAdmin();
    expect(promptFindMany).toHaveBeenCalledWith({
      where: { kind: "HOMEPAGE_BASE", deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    expect(res).toEqual({
      data: {
        model: "claude-opus-5-5",
        maxTokens: 20000,
        basePromptId: "p1",
        basePrompts: [{ id: "p1", name: "Premium" }],
      },
    });
  });
});
