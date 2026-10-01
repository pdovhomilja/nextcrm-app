import type { ImageProvider, ImageSpec } from "./types";

const BASE = "https://api.higgsfield.ai";

/**
 * Admin-facing model name -> REST endpoint path. Code-owned allow-set: the
 * model name is never interpolated into the URL, so settings values cannot
 * steer the request to an arbitrary path. Unknown names fall back to SOUL V2.
 *
 * Only `soul-v2` (`/higgsfield-ai/soul/v2/standard`) is confirmed against
 * docs.higgsfield.ai; the other paths are best-effort and must be verified
 * against the Higgsfield console before being offered in the admin UI.
 */
const DEFAULT_MODEL = "soul-v2";
const MODEL_ENDPOINTS: Record<string, string> = {
  "soul-v2": "/higgsfield-ai/soul/v2/standard",
  "marketing-studio-image": "/higgsfield-ai/marketing-studio/image",
  ideogram: "/higgsfield-ai/ideogram/v3",
  recraft: "/higgsfield-ai/recraft/v3",
  "qwen-image": "/higgsfield-ai/qwen/image",
  grok: "/higgsfield-ai/grok/image",
  "z-image": "/higgsfield-ai/z-image/standard",
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;
/** Per-request abort so a hung connection can't outlive the poll budget. */
const REQUEST_TIMEOUT_MS = 30_000;

type StatusResponse = {
  status?: string;
  error?: string | null;
  images?: { url?: string }[];
};

const TERMINAL_FAILURES = new Set(["failed", "nsfw", "canceled"]);

export function higgsfieldProvider(model: string): ImageProvider {
  const key = () => process.env.HIGGSFIELD_API_KEY;
  return {
    name: "higgsfield",
    isConfigured: () => !!key(),
    async generateImage(spec: ImageSpec): Promise<Buffer> {
      const k = key();
      if (!k) throw new Error("higgsfield not configured");
      const endpoint = Object.prototype.hasOwnProperty.call(MODEL_ENDPOINTS, model)
        ? MODEL_ENDPOINTS[model]
        : MODEL_ENDPOINTS[DEFAULT_MODEL];
      // Docs: `Authorization: Key <API_KEY_ID>:<API_KEY_SECRET>` (HIGGSFIELD_API_KEY holds "id:secret").
      const headers = { Authorization: `Key ${k}`, "content-type": "application/json" };

      const submit = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: spec.prompt, aspect_ratio: spec.aspectRatio }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!submit.ok) throw new Error(`higgsfield submit ${submit.status}: ${await submit.text()}`);
      const { status_url } = (await submit.json()) as { request_id: string; status_url: string };
      if (!status_url) throw new Error("higgsfield submit returned no status_url");
      // The status_url is polled WITH the API key, and it comes from the provider
      // response — pin it to the trusted Higgsfield https origin before sending the
      // key, so a malformed/compromised response can't exfiltrate it to another host
      // (and never over cleartext http). Mirrors the https-only result-url check below.
      let statusUrlTrusted = false;
      try {
        const su = new URL(status_url);
        statusUrlTrusted = su.protocol === "https:" && su.hostname.toLowerCase() === "api.higgsfield.ai";
      } catch {
        /* invalid URL → reject */
      }
      if (!statusUrlTrusted) throw new Error("higgsfield status_url is not the trusted https host");

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (true) {
        if (Date.now() > deadline) throw new Error("higgsfield poll timed out");
        const st = await fetch(status_url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!st.ok) throw new Error(`higgsfield status ${st.status}`);
        const data = (await st.json()) as StatusResponse;
        const url = data.images?.[0]?.url;
        if (data.status === "completed" && url) {
          // Result URLs come from the provider response; only fetch https.
          if (!url.startsWith("https://")) throw new Error("higgsfield result url is not https");
          // No Authorization header: the CDN download must not receive the API key.
          const img = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
          if (!img.ok) throw new Error(`higgsfield download ${img.status}`);
          return Buffer.from(await img.arrayBuffer());
        }
        if (data.status && TERMINAL_FAILURES.has(data.status)) {
          throw new Error(`higgsfield generation ${data.status}${data.error ? `: ${data.error}` : ""}`);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    },
  };
}
