/**
 * Convert Prisma Decimal fields to plain numbers for passing to Client Components.
 * Decimal objects are not serializable across the server/client boundary.
 */
export function serializeDecimals<T extends Record<string, unknown>>(
  obj: T
): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val !== null && val !== undefined && typeof val === "object" && "toNumber" in val && typeof (val as { toNumber: unknown }).toNumber === "function") {
      (result as Record<string, unknown>)[key] = (val as { toNumber: () => number }).toNumber();
    }
  }
  return result;
}

export function serializeDecimalsList<T extends Record<string, unknown>>(
  list: T[]
): T[] {
  return list.map(serializeDecimals);
}
