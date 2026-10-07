/** Origins Better Auth should accept (comma-separated optional extras for domain migrations). */
export function getBetterAuthTrustedOrigins(): string[] {
  const fromEnv = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      [
        "http://localhost:3000",
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, ""),
        process.env.BETTER_AUTH_URL?.replace(/\/$/, ""),
        ...(fromEnv ?? []),
      ].filter(Boolean) as string[],
    ),
  );
}

/** Client: always call auth on the site the user opened. Server: use env. */
export function getAuthClientBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
