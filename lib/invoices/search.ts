import type { Prisma } from "@prisma/client";
import type { InvoiceStatus } from "./permissions";

export interface SearchFilters {
  status?: InvoiceStatus[];
  accountId?: string;
  seriesId?: string;
  currency?: string;
  issueFrom?: Date;
  issueTo?: Date;
  amountMin?: number;
  amountMax?: number;
}

export function buildSearchWhere(f: SearchFilters): Prisma.InvoicesWhereInput {
  const where: Prisma.InvoicesWhereInput = {};
  if (f.status?.length) where.status = { in: f.status as any };
  if (f.accountId) where.accountId = f.accountId;
  if (f.seriesId) where.seriesId = f.seriesId;
  if (f.currency) where.currency = f.currency;
  if (f.issueFrom || f.issueTo) {
    const range: any = {};
    if (f.issueFrom) range.gte = f.issueFrom;
    if (f.issueTo) range.lte = f.issueTo;
    where.issueDate = range;
  }
  if (f.amountMin != null || f.amountMax != null) {
    const range: any = {};
    if (f.amountMin != null) range.gte = f.amountMin;
    if (f.amountMax != null) range.lte = f.amountMax;
    where.grandTotal = range;
  }
  return where;
}
