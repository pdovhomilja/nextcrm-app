function part(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export type BulkAddressInput = {
  prefix: string;
  middix: string;
  suffix: string;
  count: number;
  domain: string;
};

export type BulkAddressResult =
  | { emails: string[] }
  | { error: string };

/**
 * The middle number counts up, and the suffix stays.
 * trn + 10 + plx → trn10plx, trn11plx, trn12plx. Never trn101plx.
 * An empty middle starts at 1: trn + plx → trn1plx, trn2plx, …
 */
export function buildBulkWorkEmails(input: BulkAddressInput): BulkAddressResult {
  const prefix = part(input.prefix);
  const middix = part(input.middix);
  const suffix = part(input.suffix);
  const domain = input.domain.trim().toLowerCase().replace(/^@/, "");
  const count = Math.floor(input.count);

  if (!domain) return { error: "Company email domain is not configured" };
  if (!Number.isFinite(count) || count < 1) return { error: "Enter how many users to create" };
  if (count > 100) return { error: "Create at most 100 users at a time" };
  if (!prefix && !middix && !suffix) {
    return { error: "Enter a prefix, middle, suffix, or any mix of them" };
  }

  const numericMiddle = /^\d+$/.test(middix);
  const locals = Array.from({ length: count }, (_, index) => {
    if (numericMiddle) return `${prefix}${Number(middix) + index}${suffix}`;
    if (count === 1) return `${prefix}${middix}${suffix}`;
    return `${prefix}${middix}${index + 1}${suffix}`;
  });

  if (locals.some((local) => local.length < 1)) {
    return { error: "The email name would be empty. Add a prefix or middle text." };
  }

  const unique = new Set(locals);
  if (unique.size !== locals.length) {
    return { error: "Those settings would create duplicate email addresses" };
  }

  return { emails: locals.map((local) => `${local}@${domain}`) };
}
