export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_ENV_VALIDATION === "1") return; // docker build stage has no DB
  const { runPluginUpgrades } = await import("@/lib/plugins/upgrade");
  await runPluginUpgrades().catch((e) => console.error("[PLUGIN_UPGRADE]", e));
}
