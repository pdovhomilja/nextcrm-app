import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import type { PluginHttp, PluginLogger } from "@nextcrm/plugin-sdk";
import { assertPublicHost } from "@/lib/net/host-guard";

const MAX_REDIRECTS = 5;

const allowPrivateHosts = () => process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS === "true";

// Resolve the name once more at connect time and dial only an address the
// host guard accepts: the check before the request resolves separately, and a
// short-TTL name could answer public there and private here. Host header and
// TLS SNI stay the URL's hostname.
function guardedLookup(
  hostname: string,
  options: LookupOptions,
  callback: (err: Error | null, address: string | LookupAddress[], family?: number) => void,
) {
  if (allowPrivateHosts()) return dnsLookup(hostname, options, callback as never);
  assertPublicHost(hostname, false).then(
    ({ address }) => {
      const family = net.isIP(address);
      if (options.all) callback(null, [{ address, family }]);
      else callback(null, address, family);
    },
    (err: Error) => callback(err, ""),
  );
}

const dispatcher = new Agent({ connect: { lookup: guardedLookup } });

export function createHttp(log: PluginLogger): PluginHttp {
  return {
    async fetch(url, init = {}) {
      const { timeoutMs = 15_000, ...first } = init;
      let rest: typeof first = first;
      const allowPrivate = allowPrivateHosts();
      const started = Date.now();
      let current = new URL(url);
      try {
        for (let hop = 0; ; hop++) {
          await assertPublicHost(current.hostname, allowPrivate);
          // undici's RequestInit/Response are the WHATWG types the global fetch
          // uses too (Node's fetch is undici); the casts only bridge the two
          // packages' type declarations.
          const res = (await undiciFetch(current.toString(), {
            ...(rest as Parameters<typeof undiciFetch>[1]),
            redirect: "manual",
            signal: AbortSignal.timeout(timeoutMs),
            dispatcher,
          })) as unknown as Response;
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
            method !== "HEAD" && (res.status === 303 || ((res.status === 301 || res.status === 302) && method === "POST"));
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
