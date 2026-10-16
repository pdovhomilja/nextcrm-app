const KEY_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function getVentureDomainSuffix(): string {
  return (process.env.VENTURE_DOMAIN_SUFFIX ?? "vensailabs.in").trim().toLowerCase();
}

/** Normalize user input to a venture key (slug). */
export function normalizeVentureKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function isValidVentureKey(key: string): boolean {
  return KEY_RE.test(key) && key.length >= 2;
}

/** Primary ERP host: `{key}.vensailabs.in` */
export function erpHostForKey(key: string): string {
  return `${key}.${getVentureDomainSuffix()}`;
}

/** Admin portal host: `admin-{key}.vensailabs.in` */
export function adminHostForKey(key: string): string {
  return `admin-${key}.${getVentureDomainSuffix()}`;
}

export function httpsUrlForHost(host: string, path = ""): string {
  const p = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `https://${host}${p}`;
}

export function defaultErpUrl(key: string): string {
  return httpsUrlForHost(erpHostForKey(key));
}

export function defaultAdminUrl(key: string): string {
  return httpsUrlForHost(adminHostForKey(key));
}
