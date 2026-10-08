import { interceptWrite } from "@/lib/plugins/prisma-extension";
import { PluginRuleError } from "@/lib/plugins/errors";

const mkDeps = (over: Partial<Parameters<typeof interceptWrite>[1]> = {}) => ({
  hasRules: jest.fn(async () => true),
  hasInstalledPlugins: jest.fn(async () => true),
  runBeforeRules: jest.fn(async (i: any) => i.data),
  afterTargets: jest.fn(async () => [] as string[]),
  sendAfter: jest.fn(),
  findExisting: jest.fn(async () => ({ id: "a1", name: "Old", deletedAt: null })),
  findManyExisting: jest.fn(async () => [{ id: "a1" }, { id: "a2" }]),
  deleteRecordData: jest.fn(),
  ...over,
});

it("passes through unwatched models and reads", async () => {
  const deps = mkDeps();
  const query = jest.fn(async () => "ok");
  await interceptWrite({ model: "Users", operation: "update", args: { where: { id: "u" }, data: {} }, query }, deps);
  await interceptWrite({ model: "crm_Accounts", operation: "findMany", args: {}, query }, deps);
  expect(deps.runBeforeRules).not.toHaveBeenCalled();
  expect(query).toHaveBeenCalledTimes(2);
});

it("fast path: no enabled rules or afters → no lookups", async () => {
  const deps = mkDeps({ hasRules: jest.fn(async () => false) });
  await interceptWrite({ model: "crm_Accounts", operation: "update", args: { where: { id: "a1" }, data: { name: "N" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.findExisting).not.toHaveBeenCalled();
});

it("runs beforeCreate with patched data and emits after", async () => {
  const deps = mkDeps({
    runBeforeRules: jest.fn(async (i: any) => ({ ...i.data, name: "Patched" })),
    afterTargets: jest.fn(async () => ["p-one"]),
  });
  const query = jest.fn(async (a: any) => ({ id: "new", ...a.data }));
  const res = await interceptWrite({ model: "crm_Accounts", operation: "create", args: { data: { name: "X" } }, query }, deps);
  expect(query).toHaveBeenCalledWith({ data: { name: "Patched" } });
  expect(res).toMatchObject({ id: "new", name: "Patched" });
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", { entity: "account", operation: "created", recordId: "new" });
});

it("treats setting deletedAt as beforeDelete / deleted", async () => {
  const deps = mkDeps({ afterTargets: jest.fn(async () => ["p-one"]) });
  await interceptWrite({ model: "crm_Accounts", operation: "update", args: { where: { id: "a1" }, data: { deletedAt: new Date() } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.runBeforeRules).toHaveBeenCalledWith(expect.objectContaining({ operation: "beforeDelete", recordId: "a1" }));
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", expect.objectContaining({ operation: "deleted" }));
});

it("does not write when a rule rejects", async () => {
  const deps = mkDeps({ runBeforeRules: jest.fn(async () => { throw new PluginRuleError("p", "no"); }) });
  const query = jest.fn();
  await expect(interceptWrite({ model: "crm_Leads", operation: "create", args: { data: {} }, query }, deps)).rejects.toBeInstanceOf(PluginRuleError);
  expect(query).not.toHaveBeenCalled();
});

it("runs rules per row for updateMany and refuses modify on bulk", async () => {
  const deps = mkDeps({ runBeforeRules: jest.fn(async (i: any) => i.data) });
  await interceptWrite({ model: "crm_Contacts", operation: "updateMany", args: { where: { x: 1 }, data: { a: 1 } }, query: async () => ({ count: 2 }) }, deps);
  expect(deps.runBeforeRules).toHaveBeenCalledTimes(2);
  const modifying = mkDeps({ runBeforeRules: jest.fn(async () => ({ a: 2 })) });
  await expect(
    interceptWrite({ model: "crm_Contacts", operation: "updateMany", args: { where: {}, data: { a: 1 } }, query: async () => ({ count: 2 }) }, modifying),
  ).rejects.toThrow("Plugin rules cannot modify bulk writes");
});

it("deletes plugin data on hard delete", async () => {
  const deps = mkDeps();
  await interceptWrite({ model: "crm_Accounts", operation: "delete", args: { where: { id: "a1" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.deleteRecordData).toHaveBeenCalledWith("account", ["a1"]);
});

it("upsert without an existing row runs beforeCreate and emits created", async () => {
  const deps = mkDeps({ findExisting: jest.fn(async () => null), afterTargets: jest.fn(async () => ["p-one"]) });
  const query = jest.fn(async (a: any) => ({ id: "new", ...a.create }));
  await interceptWrite({ model: "crm_Accounts", operation: "upsert", args: { where: { id: "x" }, create: { name: "C" }, update: { name: "U" } }, query }, deps);
  expect(deps.runBeforeRules).toHaveBeenCalledWith(expect.objectContaining({ operation: "beforeCreate", data: { name: "C" } }));
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", { entity: "account", operation: "created", recordId: "new" });
});

it("deleteMany runs rules per row, cleans plugin data and emits deleted for every id", async () => {
  const deps = mkDeps({ afterTargets: jest.fn(async () => ["p-one"]) });
  await interceptWrite({ model: "crm_Accounts", operation: "deleteMany", args: { where: {} }, query: async () => ({ count: 2 }) }, deps);
  expect(deps.runBeforeRules).toHaveBeenCalledTimes(2);
  expect(deps.runBeforeRules).toHaveBeenCalledWith(expect.objectContaining({ operation: "beforeDelete", recordId: "a2" }));
  expect(deps.deleteRecordData).toHaveBeenCalledWith("account", ["a1", "a2"]);
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", { entity: "account", operation: "deleted", recordId: "a1" });
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", { entity: "account", operation: "deleted", recordId: "a2" });
});

it("uses the existing row's id when the write selects no id", async () => {
  const deps = mkDeps({ afterTargets: jest.fn(async () => ["p-one"]) });
  await interceptWrite({ model: "crm_Accounts", operation: "update", args: { where: { id: "a1" }, data: { name: "N" }, select: { name: true } }, query: async () => ({ name: "N" }) }, deps);
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", { entity: "account", operation: "updated", recordId: "a1" });
  await interceptWrite({ model: "crm_Accounts", operation: "delete", args: { where: { id: "a1" }, select: { name: true } }, query: async () => ({ name: "Old" }) }, deps);
  expect(deps.deleteRecordData).toHaveBeenCalledWith("account", ["a1"]);
});

it("does not send after-events back to the plugin that made the write; other plugins still get them (I2)", async () => {
  const { runAsActor } = await import("@/lib/plugins/actor");
  const deps = mkDeps({ afterTargets: jest.fn(async () => ["p-one", "p-two"]) });
  await runAsActor({ type: "plugin", pluginId: "p-one" }, () =>
    interceptWrite({ model: "crm_Accounts", operation: "update", args: { where: { id: "a1" }, data: { name: "N" } }, query: async () => ({ id: "a1" }) }, deps));
  expect(deps.sendAfter).toHaveBeenCalledTimes(1);
  expect(deps.sendAfter).toHaveBeenCalledWith("p-two", { entity: "account", operation: "updated", recordId: "a1" });
});

it("cleans plugin data on hard delete when only stores are used (M2)", async () => {
  const deps = mkDeps({ hasRules: jest.fn(async () => false) });   // afterTargets default: []
  await interceptWrite({ model: "crm_Accounts", operation: "delete", args: { where: { id: "a1" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.deleteRecordData).toHaveBeenCalledWith("account", ["a1"]);
  await interceptWrite({ model: "crm_Accounts", operation: "deleteMany", args: { where: {} }, query: async () => ({ count: 2 }) }, deps);
  expect(deps.deleteRecordData).toHaveBeenCalledWith("account", ["a1", "a2"]);
});

it("keeps the fast path for deletes when no plugin is installed", async () => {
  const deps = mkDeps({ hasRules: jest.fn(async () => false), hasInstalledPlugins: jest.fn(async () => false) });
  await interceptWrite({ model: "crm_Accounts", operation: "delete", args: { where: { id: "a1" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.findExisting).not.toHaveBeenCalled();
  expect(deps.deleteRecordData).not.toHaveBeenCalled();
});

it("forces id into select so created after-events carry the record id (M4)", async () => {
  const deps = mkDeps({ afterTargets: jest.fn(async (_e: any, op: any) => (op === "created" ? ["p1"] : [])) });
  const query = jest.fn(async (args: any) => ({ id: args.select?.id ? "new1" : undefined, name: "N" }));
  await interceptWrite({ model: "crm_Accounts", operation: "create", args: { data: { name: "N" }, select: { name: true } }, query }, deps);
  expect(query.mock.calls[0][0].select).toEqual({ name: true, id: true });
  expect(deps.sendAfter).toHaveBeenCalledWith("p1", { entity: "account", operation: "created", recordId: "new1" });
});
