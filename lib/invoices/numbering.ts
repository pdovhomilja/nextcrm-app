import type { Prisma, PrismaClient } from "@prisma/client";

export function formatNumber(template: string, year: number, counter: number): string {
  return template
    .replace(/\{YYYY\}/g, String(year))
    .replace(/\{(#+)\}/g, (_, hashes: string) =>
      String(counter).padStart(hashes.length, "0"),
    );
}

type TxClient = Prisma.TransactionClient | PrismaClient;

export async function consumeNextNumber(
  tx: TxClient,
  seriesId: string,
  now: Date = new Date(),
): Promise<{ number: string; seriesId: string }> {
  const series = await tx.invoice_Series.findUniqueOrThrow({ where: { id: seriesId } });
  const year = now.getUTCFullYear();
  let counter = series.counter;
  if (series.resetPolicy === "YEARLY" && series.currentYear !== year) {
    counter = 0;
  }
  counter += 1;
  await tx.invoice_Series.update({
    where: { id: seriesId },
    data: { counter, currentYear: year },
  });
  return { number: formatNumber(series.prefixTemplate, year, counter), seriesId };
}
