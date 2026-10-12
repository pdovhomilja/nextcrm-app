import type { Entity, PluginStore, RecordStore } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import { PluginStoreError } from "./errors";

const MAX_BYTES = 256 * 1024;

function scoped(pluginId: string, entityType: string, entityId: string): RecordStore {
  const where = (key: string) => ({ pluginId_entityType_entityId_key: { pluginId, entityType, entityId, key } });
  return {
    async get<T>(key: string) {
      const row = await prismaBase.pluginData.findUnique({ where: where(key) });
      return (row?.value ?? null) as T | null;
    },
    async set(key, value) {
      const json = JSON.stringify(value);
      if (json === undefined) throw new PluginStoreError("Store value must be JSON-serialisable");
      if (Buffer.byteLength(json, "utf8") > MAX_BYTES) throw new PluginStoreError(`Store value for ${key} exceeds 256 KB`);
      await prismaBase.pluginData.upsert({
        where: where(key),
        create: { pluginId, entityType, entityId, key, value: value as never },
        update: { value: value as never },
      });
    },
    async delete(key) {
      await prismaBase.pluginData.deleteMany({ where: { pluginId, entityType, entityId, key } });
    },
    async list(prefix = "") {
      const rows = await prismaBase.pluginData.findMany({
        where: { pluginId, entityType, entityId, key: { startsWith: prefix } },
        orderBy: { key: "asc" },
      });
      return rows.map((r) => ({ key: r.key, value: r.value }));
    },
    async claim(key, ms) {
      // One statement, database clock: insert the lock, or take it over only when the stored one has expired.
      const rows = await prismaBase.$queryRaw<{ key: string }[]>`
        INSERT INTO "PluginData" ("id", "pluginId", "entityType", "entityId", "key", "value", "updatedAt")
        VALUES (gen_random_uuid(), ${pluginId}, ${entityType}, ${entityId}, ${key},
                jsonb_build_object('until', to_char((now() + ${ms}::int * interval '1 millisecond') AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')), now())
        ON CONFLICT ("pluginId", "entityType", "entityId", "key") DO UPDATE
          SET "value" = EXCLUDED."value", "updatedAt" = now()
          WHERE ("PluginData"."value"->>'until') IS NULL OR ("PluginData"."value"->>'until')::timestamptz <= now()
        RETURNING "key"`;
      return rows.length > 0;
    },
  };
}

export function createStore(pluginId: string): PluginStore {
  return { ...scoped(pluginId, "", ""), forRecord: (entity: Entity, id: string) => scoped(pluginId, entity, id) };
}
