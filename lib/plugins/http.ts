import type { PluginHttp, PluginLogger } from "@nextcrm/plugin-sdk";
import { assertPublicHost } from "@/lib/net/host-guard";

const MAX_REDIRECTS = 5;

export function createHttp(log: PluginLogger): PluginHttp {
  return {
    async fetch(url, init = {}) {
      const { timeoutMs = 15_000, ...first } = init;
      let rest: typeof first = first;
      const allowPrivate = process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS === "true";
      const started = Date.now();
      let current = new URL(url);
      try {
        for (let hop = 0; ; hop++) {
          await assertPublicHost(current.hostname, allowPrivate);
          const res = await fetch(current.toString(), { ...rest, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
          const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
          if (!location) {
            log.debug("http", { url: `${current.origin}${current.pathname}`, status: res.status, ms: Date.now() - started });
            return res;
          }
          if (hop >= MAX_REDIRECTS) throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
          const next = new URL(location, current);
          const headers = new Headers(rest.headers);
          if (next.origin !== current.origin) {
            headers.delete("authorization");
            headers.delete("cookie");
            headers.delete("proxy-authorization");
          }
          const method = (rest.method ?? "GET").toUpperCase();
          const toGet =
            method !== "HEAD" && (res.status === 303 || ((res.status === 301 || res.status === 302) && method !== "GET"));
          if (toGet) {
            headers.delete("content-type");
            headers.delete("content-length");
            const { body: _body, ...noBody } = rest;
            rest = { ...noBody, method: "GET", headers };
          } else {
            rest = { ...rest, headers };
          }
          current = next;
        }
      } catch (e) {
        log.warn("http failed", { url: `${current.origin}${current.pathname}`, ms: Date.now() - started, error: String(e) });
        throw e;
      }
    },
  };
}
