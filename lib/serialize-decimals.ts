/**
 * Convert Prisma Decimal fields to plain numbers for passing to Client Components.
 * Decimal objects are not serializable across the server/client boundary.
 */
export function serializeDecimals<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  const result: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (
      val !== null &&
      val !== undefined &&
      typeof val === "object" &&
      "toNumber" in val &&
      typeof (val as { toNumber?: unknown }).toNumber === "function"
    ) {
      result[key] = (val as { toNumber: () => number }).toNumber();
    }
  }
  return result as T;
}

export function serializeDecimalsList<T>(list: T[]): T[] {
  return list.map(serializeDecimals);
}
