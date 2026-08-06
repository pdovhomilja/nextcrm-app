/**
 * Convert Prisma Decimal fields to plain numbers for passing to Client Components.
 * Decimal objects are not serializable across the server/client boundary.
 * Recurses into nested objects and arrays so related records (lineItems, account,
 * taxRate, ...) are fully serialized.
 */
function isDecimalLike(val: unknown): val is { toNumber: () => number } {
  return (
    val !== null &&
    typeof val === "object" &&
    "toNumber" in val &&
    typeof (val as { toNumber?: unknown }).toNumber === "function"
  );
}

export function serializeDecimals<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj as T;
  if (isDecimalLike(obj)) return obj.toNumber() as T;
  if (Array.isArray(obj)) return obj.map(serializeDecimals) as T;
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = serializeDecimals(val);
  }
  return result as T;
}

export function serializeDecimalsList<T>(list: T[]): T[] {
  return list.map(serializeDecimals);
}
