import { Prisma } from "@prisma/client";
import { formatNumber } from "@/lib/invoices/numbering";
import { OrderError } from "./types";

type RawClient = { $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T> };
type Row = { id: string; template: string; counter: number; currentYear: number | null };

/**
 * One atomic UPDATE … RETURNING on the scope's default series, so parallel creations never share a number
 * and a rolled-back transaction consumes nothing. YEARLY series restart at 1 when the UTC year changes.
 */
export async function allocateNumber(tx: RawClient, scope: string, now: Date = new Date()): Promise<{ number: string; seriesId: string }> {
  const year = now.getUTCFullYear();
  const rows = await tx.$queryRaw<Row[]>(Prisma.sql`
    UPDATE "NumberSeries"
    SET "counter" = CASE WHEN "resetPolicy" = 'YEARLY' AND "currentYear" IS DISTINCT FROM ${year} THEN 1 ELSE "counter" + 1 END,
        "currentYear" = ${year},
        "updatedAt" = now()
    WHERE "id" = (
      SELECT "id" FROM "NumberSeries" WHERE "scope" = ${scope} AND "isDefault" AND "active" ORDER BY "createdAt" LIMIT 1
    )
    RETURNING "id", "template", "counter", "currentYear"`);
  const row = rows[0];
  if (!row) throw new OrderError("noSeries");
  return { seriesId: row.id, number: formatNumber(row.template, year, Number(row.counter)) };
}

export function previewNumber(template: string, counter: number, now: Date = new Date()): string {
  return formatNumber(template, now.getUTCFullYear(), counter + 1);
}
