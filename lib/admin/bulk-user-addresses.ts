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
 * One user: prefix + middle + suffix.
 * Many users: prefix and middle stay, and the suffix becomes 1, 2, 3… up to the count.
 * trn + 1 + plx and count 1 → trn1plx@domain
 * trn + 1 and count 10 → trn11@domain … trn110@domain
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

  const locals =
    count === 1
      ? [`${prefix}${middix}${suffix}`]
      : Array.from({ length: count }, (_, index) => `${prefix}${middix}${index + 1}`);

  if (locals.some((local) => local.length < 1)) {
    return { error: "The email name would be empty. Add a prefix or middle text." };
  }

  const unique = new Set(locals);
  if (unique.size !== locals.length) {
    return { error: "Those settings would create duplicate email addresses" };
  }

  return { emails: locals.map((local) => `${local}@${domain}`) };
}
