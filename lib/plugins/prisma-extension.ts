import { Prisma, type PrismaClient } from "@prisma/client";
import type { AfterOperation, BeforeOperation, Entity, RecordData } from "@nextcrm/plugin-sdk";
import { MODEL_TO_ENTITY } from "./rules";
import { currentActorFrame } from "./actor";

const WRITE_OPS = new Set(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"]);

export interface InterceptDeps {
  hasRules(entity: Entity): Promise<boolean>;
  hasInstalledPlugins(): Promise<boolean>;
  runBeforeRules(input: { entity: Entity; operation: BeforeOperation; recordId: string | null; data: RecordData; existing: RecordData | null }): Promise<RecordData>;
  afterTargets(entity: Entity, operation: AfterOperation): Promise<string[]>;
  sendAfter(pluginId: string, data: { entity: Entity; operation: AfterOperation; recordId: string }): void;
  findExisting(model: string, where: unknown): Promise<RecordData | null>;
  findManyExisting(model: string, where: unknown): Promise<RecordData[]>;
  deleteRecordData(entity: Entity, ids: string[]): void;
}

interface Params { model?: string; operation: string; args: any; query: (args: any) => Promise<any> }

const isSoftDelete = (data: RecordData | undefined, existing: RecordData | null) =>
  !!data && data.deletedAt != null && existing?.deletedAt == null;

// After-events need the record id even when the caller's select omits it.
const withId = (args: any) => (args.select && !args.select.id ? { ...args, select: { ...args.select, id: true } } : args);

export async function interceptWrite(p: Params, deps: InterceptDeps): Promise<any> {
  const entity = p.model ? MODEL_TO_ENTITY[p.model] : undefined;
  if (!entity || !WRITE_OPS.has(p.operation)) return p.query(p.args);
  const anyAfter = async () =>
    (await deps.afterTargets(entity, "created")).length + (await deps.afterTargets(entity, "updated")).length + (await deps.afterTargets(entity, "deleted")).length > 0;
  const isHardDelete = p.operation === "delete" || p.operation === "deleteMany";
  if (!(await deps.hasRules(entity)) && !(await anyAfter()) && !(isHardDelete && (await deps.hasInstalledPlugins()))) return p.query(p.args);

  const model = p.model as string;
  const emit = async (operation: AfterOperation, ids: string[]) => {
    // Loop guard: a plugin's own writes never trigger its own after-actions.
    const actor = currentActorFrame()?.actor;
    const writer = actor?.type === "plugin" ? actor.pluginId : null;
    for (const pluginId of await deps.afterTargets(entity, operation)) {
      if (pluginId === writer) continue;
      for (const recordId of ids) deps.sendAfter(pluginId, { entity, operation, recordId });
    }
  };

  switch (p.operation) {
    case "create": {
      const data = await deps.runBeforeRules({ entity, operation: "beforeCreate", recordId: null, data: p.args.data, existing: null });
      const row = await p.query(withId({ ...p.args, data }));
      await emit("created", [row.id]);
      return row;
    }
    case "createMany": {
      const items: RecordData[] = Array.isArray(p.args.data) ? p.args.data : [p.args.data];
      for (const item of items) {
        const out = await deps.runBeforeRules({ entity, operation: "beforeCreate", recordId: null, data: item, existing: null });
        if (JSON.stringify(out) !== JSON.stringify(item)) throw new Error("Plugin rules cannot modify bulk writes");
      }
      return p.query(p.args);   // createMany returns only a count; after-actions are not emitted for bulk creates
    }
    case "update":
    case "upsert": {
      const existing = await deps.findExisting(model, p.args.where);
      if (p.operation === "upsert" && !existing) {
        const data = await deps.runBeforeRules({ entity, operation: "beforeCreate", recordId: null, data: p.args.create, existing: null });
        const row = await p.query(withId({ ...p.args, create: data }));
        await emit("created", [row.id]);
        return row;
      }
      const input = p.operation === "upsert" ? p.args.update : p.args.data;
      const soft = isSoftDelete(input, existing);
      const operation: BeforeOperation = soft ? "beforeDelete" : "beforeUpdate";
      const data = await deps.runBeforeRules({ entity, operation, recordId: (existing?.id as string) ?? null, data: input, existing });
      const row = await p.query(p.operation === "upsert" ? { ...p.args, update: data } : { ...p.args, data });
      await emit(soft ? "deleted" : "updated", [(existing?.id as string) ?? row.id]);
      return row;
    }
    case "updateMany":
    case "deleteMany": {
      const rows = await deps.findManyExisting(model, p.args.where);
      const ids = rows.map((r) => r.id as string);
      for (const existing of rows) {
        const input = p.operation === "updateMany" ? p.args.data : {};
        const soft = p.operation === "updateMany" && isSoftDelete(input, existing);
        const operation: BeforeOperation = p.operation === "deleteMany" || soft ? "beforeDelete" : "beforeUpdate";
        const out = await deps.runBeforeRules({ entity, operation, recordId: existing.id as string, data: input, existing });
        if (JSON.stringify(out) !== JSON.stringify(input)) throw new Error("Plugin rules cannot modify bulk writes");
      }
      const res = await p.query(p.args);
      if (p.operation === "deleteMany") { deps.deleteRecordData(entity, ids); await emit("deleted", ids); }
      else await emit(isSoftDelete(p.args.data, null) ? "deleted" : "updated", ids);
      return res;
    }
    case "delete": {
      const existing = await deps.findExisting(model, p.args.where);
      await deps.runBeforeRules({ entity, operation: "beforeDelete", recordId: (existing?.id as string) ?? null, data: {}, existing });
      const row = await p.query(p.args);
      const id = (existing?.id as string) ?? row.id;
      deps.deleteRecordData(entity, [id]);
      await emit("deleted", [id]);
      return row;
    }
  }
  return p.query(p.args);
}

export function withPluginRules(base: PrismaClient) {
  const deps: InterceptDeps = {
    hasRules: async (entity) => (await import("./rules")).hasRules(entity),
    hasInstalledPlugins: async () => {
      const { getRegistry } = await import("./registry");
      if (!getRegistry().length) return false;   // zero-plugin instances: no query
      return (await (await import("./state")).getPluginStates()).length > 0;
    },
    runBeforeRules: async (input) => (await import("./rules")).runBeforeRules(input),
    afterTargets: async (entity, op) => (await import("./rules")).afterTargets(entity, op),
    sendAfter: (pluginId, data) => {
      void import("@/inngest/client").then(({ inngest }) => inngest.send({ name: `plugin/${pluginId}/after`, data }))
        .catch((e) => console.error("[PLUGIN_AFTER_SEND]", e));
    },
    findExisting: (model, where) => (base as any)[model].findUnique({ where }),
    findManyExisting: (model, where) => (base as any)[model].findMany({ where }),
    deleteRecordData: (entity, ids) => {
      void base.pluginData.deleteMany({ where: { entityType: entity, entityId: { in: ids } } }).catch((e) => console.error("[PLUGIN_DATA_CLEANUP]", e));
    },
  };
  return base.$extends(
    Prisma.defineExtension({
      name: "plugin-rules",
      query: {
        $allModels: {
          $allOperations: ({ model, operation, args, query }) => interceptWrite({ model, operation, args, query }, deps),
        },
      },
    }),
  );
}
