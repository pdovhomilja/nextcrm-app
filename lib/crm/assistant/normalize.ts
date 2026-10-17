// Normalization used to match an AI-assistant caller to an existing lead.
// Rade's market is US (913 area code), so a bare 10-digit number is treated as +1.

export function normalizeEmail(raw: string | undefined | null): string | null {
  const email = raw?.trim().toLowerCase();
  return email ? email : null;
}

/** Returns an E.164 string (e.g. "+19135550142"), or null if it can't be one. */
export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const hasPlus = raw.trim().startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!hasPlus) {
    if (digits.length === 10) digits = `1${digits}`;
    else if (!(digits.length === 11 && digits.startsWith("1"))) return null;
  }
  // E.164: max 15 digits; 8 is a practical floor for a real international number.
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/**
 * Digit-only forms a stored lead phone might reduce to. Lead phones are free-form
 * text, so US numbers may be stored with or without the leading country code.
 */
export function phoneMatchVariants(e164: string | null): string[] {
  if (!e164) return [];
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return [digits, digits.slice(1)];
  return [digits];
}

/** Splits a free-text name into the lead's firstName / (required) lastName. */
export function splitName(raw: string | undefined | null): {
  firstName: string | undefined;
  lastName: string;
} {
  const parts = (raw ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: undefined, lastName: "Unknown" };
  const lastName = parts.pop() as string;
  return { firstName: parts.length ? parts.join(" ") : undefined, lastName };
}
