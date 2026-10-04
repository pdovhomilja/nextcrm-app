import type { PluginHttp, PluginLogger } from "@nextcrm/plugin-sdk";
import { assertPublicHost } from "@/lib/net/host-guard";

export function createHttp(log: PluginLogger): PluginHttp {
  return {
    async fetch(url, init = {}) {
      const { timeoutMs = 15_000, ...rest } = init;
      const u = new URL(url);
      if (process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS !== "true") await assertPublicHost(u.hostname);
      const started = Date.now();
      try {
        const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
        log.debug("http", { url: `${u.origin}${u.pathname}`, status: res.status, ms: Date.now() - started });
        return res;
      } catch (e) {
        log.warn("http failed", { url: `${u.origin}${u.pathname}`, ms: Date.now() - started, error: String(e) });
        throw e;
      }
    },
  };
}
