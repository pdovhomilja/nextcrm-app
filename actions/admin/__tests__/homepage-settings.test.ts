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
import { DEFAULT_IMAGE_MODEL, DEFAULT_IMAGE_COUNT, DEFAULT_IMAGE_PROVIDER } from "@/lib/homepage/settings";
import {
  getHomepageSettingsForAdmin,
  saveHomepageSettings,
} from "../homepage-settings";

const requireRoleMock = requireRole as jest.Mock;
const upsert = prismadb.crm_SystemSettings.upsert as jest.Mock;
const settingsFindMany = prismadb.crm_SystemSettings.findMany as jest.Mock;
const promptFindFirst = prismadb.crm_Ai_Prompt.findFirst as jest.Mock;
const promptFindMany = prismadb.crm_Ai_Prompt.findMany as jest.Mock;

const IMG = { imageModel: "soul-v2", imageCount: 3, imageProvider: "auto", varyDesign: true };
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
      ...IMG,
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
      ...IMG,
    });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("requires the admin role", async () => {
    asAdmin();
    await saveHomepageSettings({ model: "claude-sonnet-5-5", maxTokens: 20000, basePromptId: null, ...IMG });
    expect(requireRoleMock).toHaveBeenCalledWith(["admin"]);
  });

  it("persists the default model when given an unknown one", async () => {
    asAdmin();
    const res = await saveHomepageSettings({ model: "gpt-4", maxTokens: 20000, basePromptId: null, ...IMG });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "homepage.model" },
      create: { key: "homepage.model", value: "claude-sonnet-5-5" },
      update: { value: "claude-sonnet-5-5" },
    });
    expect(res).toEqual({
      data: {
        model: "claude-sonnet-5-5",
        maxTokens: 20000,
        basePromptId: null,
        imageModel: DEFAULT_IMAGE_MODEL,
        imageCount: DEFAULT_IMAGE_COUNT,
        imageProvider: DEFAULT_IMAGE_PROVIDER,
        varyDesign: true,
      },
    });
  });

  it("clamps maxTokens to the floor", async () => {
    asAdmin();
    const res = await saveHomepageSettings({ model: "claude-sonnet-5-5", maxTokens: 999, basePromptId: null, ...IMG });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "homepage.max_tokens" },
      create: { key: "homepage.max_tokens", value: "4000" },
      update: { value: "4000" },
    });
    expect(res).toEqual({
      data: {
        model: "claude-sonnet-5-5",
        maxTokens: 4000,
        basePromptId: null,
        imageModel: DEFAULT_IMAGE_MODEL,
        imageCount: DEFAULT_IMAGE_COUNT,
        imageProvider: DEFAULT_IMAGE_PROVIDER,
        varyDesign: true,
      },
    });
  });

  it("rejects an unknown base prompt with no writes", async () => {
    asAdmin();
    promptFindFirst.mockResolvedValue(null);
    const res = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: "nope",
      ...IMG,
    });
    expect(res).toEqual({ error: expect.stringMatching(/not found/) });
    expect(promptFindFirst).toHaveBeenCalledWith({
      where: { id: "nope", kind: "HOMEPAGE_BASE", deletedAt: null },
      select: { id: true },
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("saves all seven keys, audits, and returns the data (happy path)", async () => {
    asAdmin();
    promptFindFirst.mockResolvedValue({ id: "p1" });
    const res = await saveHomepageSettings({
      model: "claude-opus-5-5",
      maxTokens: 30000,
      basePromptId: "p1",
      ...IMG,
    });
    const keys = upsert.mock.calls.map((c) => [c[0].where.key, c[0].update.value]);
    expect(keys).toEqual([
      ["homepage.model", "claude-opus-5-5"],
      ["homepage.max_tokens", "30000"],
      ["homepage.base_prompt_id", "p1"],
      ["homepage.image_model", "soul-v2"],
      ["homepage.image_count", "3"],
      ["homepage.image_provider", "auto"],
      ["homepage.vary_design", "true"],
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
    expect(res).toEqual({
      data: {
        model: "claude-opus-5-5",
        maxTokens: 30000,
        basePromptId: "p1",
        imageModel: DEFAULT_IMAGE_MODEL,
        imageCount: DEFAULT_IMAGE_COUNT,
        imageProvider: DEFAULT_IMAGE_PROVIDER,
        varyDesign: true,
      },
    });
  });

  it("validates image fields: unknown model -> default, count clamped, provider validated", async () => {
    asAdmin();
    const res = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: null,
      imageModel: "not-a-model",
      imageCount: 99,
      imageProvider: "midjourney",
      varyDesign: true,
    });
    const rows = Object.fromEntries(upsert.mock.calls.map((c) => [c[0].where.key, c[0].update.value]));
    expect(rows["homepage.image_model"]).toBe(DEFAULT_IMAGE_MODEL);
    expect(rows["homepage.image_count"]).toBe("6");
    expect(rows["homepage.image_provider"]).toBe(DEFAULT_IMAGE_PROVIDER);
    expect(res).toEqual({
      data: expect.objectContaining({ imageModel: DEFAULT_IMAGE_MODEL, imageCount: 6, imageProvider: DEFAULT_IMAGE_PROVIDER }),
    });
  });

  it("returns the REAL saved image values (not defaults) and clamps negative/NaN counts", async () => {
    asAdmin();
    const res = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: null,
      imageModel: "ideogram",
      imageCount: 0,
      imageProvider: "openai",
      varyDesign: true,
    });
    expect(res).toEqual({
      data: expect.objectContaining({ imageModel: "ideogram", imageCount: 0, imageProvider: "openai" }),
    });
    const rows = Object.fromEntries(upsert.mock.calls.map((c) => [c[0].where.key, c[0].update.value]));
    expect(rows["homepage.image_count"]).toBe("0");

    upsert.mockClear();
    const nan = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: null,
      imageModel: "soul-v2",
      imageCount: NaN,
      imageProvider: "higgsfield",
      varyDesign: true,
    });
    expect(nan).toEqual({ data: expect.objectContaining({ imageCount: DEFAULT_IMAGE_COUNT, imageProvider: "higgsfield" }) });
  });

  it("persists varyDesign=false as the string \"false\", audits it, and returns it", async () => {
    asAdmin();
    const res = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: null,
      ...IMG,
      varyDesign: false,
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { key: "homepage.vary_design" },
      create: { key: "homepage.vary_design", value: "false" },
      update: { value: "false" },
    });
    expect(res).toEqual({ data: expect.objectContaining({ varyDesign: false }) });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: [
          expect.objectContaining({ new: expect.stringContaining("vary_design=false") }),
        ],
      }),
    );
  });

  it("coerces a non-boolean varyDesign to a strict boolean (only literal true enables)", async () => {
    asAdmin();
    const res = await saveHomepageSettings({
      model: "claude-sonnet-5-5",
      maxTokens: 20000,
      basePromptId: null,
      ...IMG,
      varyDesign: "false" as unknown as boolean,
    });
    const rows = Object.fromEntries(upsert.mock.calls.map((c) => [c[0].where.key, c[0].update.value]));
    expect(rows["homepage.vary_design"]).toBe("false");
    expect(res).toEqual({ data: expect.objectContaining({ varyDesign: false }) });
  });

  it("stores an empty string when basePromptId is null", async () => {
    asAdmin();
    await saveHomepageSettings({ model: "claude-sonnet-5-5", maxTokens: 20000, basePromptId: null, ...IMG });
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
      { key: "homepage.image_model", value: "soul-v2" },
      { key: "homepage.image_count", value: "3" },
      { key: "homepage.image_provider", value: "auto" },
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
        imageModel: "soul-v2",
        imageCount: 3,
        imageProvider: "auto",
        varyDesign: true,
        imageProviders: { higgsfield: expect.any(Boolean), openai: expect.any(Boolean) },
        basePrompts: [{ id: "p1", name: "Premium" }],
      },
    });
  });

  it("returns varyDesign=false when the stored setting is the literal \"false\"", async () => {
    asAdmin();
    settingsFindMany.mockResolvedValue([{ key: "homepage.vary_design", value: "false" }]);
    promptFindMany.mockResolvedValue([]);
    const res = await getHomepageSettingsForAdmin();
    expect("data" in res && res.data.varyDesign).toBe(false);
  });

  describe("imageProviders presence", () => {
    const saved = { h: process.env.HIGGSFIELD_API_KEY, o: process.env.OPENAI_API_KEY };
    afterEach(() => {
      if (saved.h === undefined) delete process.env.HIGGSFIELD_API_KEY;
      else process.env.HIGGSFIELD_API_KEY = saved.h;
      if (saved.o === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = saved.o;
    });

    it("exposes presence booleans only, never key values", async () => {
      asAdmin();
      settingsFindMany.mockResolvedValue([]);
      promptFindMany.mockResolvedValue([]);
      process.env.HIGGSFIELD_API_KEY = "sentinel-hf-key:sentinel-secret";
      delete process.env.OPENAI_API_KEY;
      const res = await getHomepageSettingsForAdmin();
      expect("data" in res && res.data.imageProviders).toEqual({ higgsfield: true, openai: false });
      const json = JSON.stringify(res);
      expect(json).not.toContain("sentinel-hf-key");
      expect(json).not.toContain("sentinel-secret");
    });

    it("reports both providers configured / unconfigured", async () => {
      asAdmin();
      settingsFindMany.mockResolvedValue([]);
      promptFindMany.mockResolvedValue([]);
      process.env.OPENAI_API_KEY = "sk-sentinel-openai";
      delete process.env.HIGGSFIELD_API_KEY;
      const res = await getHomepageSettingsForAdmin();
      expect("data" in res && res.data.imageProviders).toEqual({ higgsfield: false, openai: true });
      expect(JSON.stringify(res)).not.toContain("sk-sentinel-openai");
    });
  });
});
