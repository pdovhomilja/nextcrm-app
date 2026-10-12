export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_ENV_VALIDATION === "1") return; // docker build stage has no DB
  const { runPluginUpgrades } = await import("@/lib/plugins/upgrade");
  // Not awaited: onUpgrade hooks may take minutes and must not block serving. Replicas are
  // serialized by the advisory lock; until a plugin's upgrade finishes its code is already the new version and only the stored version is old.
  void runPluginUpgrades().catch((e) => console.error("[PLUGIN_UPGRADE]", e));
}
