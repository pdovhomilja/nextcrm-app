const MONGO_KEYS = ["MONGODB_URI", "DATABASE_URL"] as const;

/** Keep venture .env in sync when the database URL field changes. */
export function mergeDatabaseUrlIntoEnv(envContent: string, databaseUrl: string): string {
  const url = databaseUrl.trim();
  if (!url) return envContent;

  const lines = envContent.split(/\r?\n/);
  let replaced = false;
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (MONGO_KEYS.includes(key as (typeof MONGO_KEYS)[number])) {
      replaced = true;
      return `MONGODB_URI=${url}`;
    }
    return line;
  });

  if (!replaced) {
    out.push(`MONGODB_URI=${url}`);
  }
  return out.join("\n");
}
