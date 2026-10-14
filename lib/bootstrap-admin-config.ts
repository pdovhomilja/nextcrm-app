/** Personal email Better Auth uses for login (BOOTSTRAP_ADMIN_EMAIL). */
export function getBootstrapAdminEmail(): string {
  return (process.env.BOOTSTRAP_ADMIN_EMAIL || "jaybabu0610@gmail.com").trim().toLowerCase();
}

/** Used by `pnpm db:seed` / `pnpm bootstrap:admin` only — not for client bundles. */
export function getBootstrapAdminSeedConfig() {
  return {
    email: getBootstrapAdminEmail(),
    workEmail: (process.env.BOOTSTRAP_ADMIN_WORK_EMAIL || "ceo@vensailabs.in")
      .trim()
      .toLowerCase(),
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "J@yandra06",
    name: (process.env.BOOTSTRAP_ADMIN_NAME || "Jayandra").trim(),
  };
}
