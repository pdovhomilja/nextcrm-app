import type { Ctx } from "./settings";
import { K } from "./store";

export class OdooError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "OdooError"; }
}
export class OdooAuthError extends OdooError {
  constructor(status: number) { super("Odoo rejected the API key", status); this.name = "OdooAuthError"; }
}

/** Spec § 3.1: the transport behind an interface, so an XML-RPC client could replace JSON-2. */
export interface OdooClient {
  /** `once`: a write; never retried inside the client, so a timeout cannot create a record twice (plan Ruling 2). */
  call<T = unknown>(model: string, method: string, body?: Record<string, unknown>, opts?: { once?: boolean }): Promise<T>;
  version(): Promise<string>;
}

type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BACKOFF = [2000, 4000];   // 3 attempts in total

export function jsonClient(ctx: Ctx, sleep: Sleep = realSleep): OdooClient {
  const base = ctx.settings.url.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", Authorization: `bearer ${ctx.secrets.apiKey}`, "X-Odoo-Database": ctx.settings.database };
  async function post(path: string, body: unknown, once = false): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await ctx.http.fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body), timeoutMs: 30_000 });
      } catch (e) {
        if (once || attempt >= BACKOFF.length) throw new OdooError(`Odoo unreachable: ${String(e)}`, 0);
        await sleep(BACKOFF[attempt]);
        continue;
      }
      if (res.status === 401) throw new OdooAuthError(res.status);
      if (res.status >= 500) {
        if (once || attempt >= BACKOFF.length) throw new OdooError(`Odoo error ${res.status}`, res.status);
        await sleep(BACKOFF[attempt]);
        continue;
      }
      const data = await res.json().catch(() => null);
      const message = (data as { message?: string } | null)?.message ?? res.statusText;
      // 403 is a missing access right (e.g. on countries or users), not a bad key.
      if (res.status === 403) throw new OdooError(`Odoo denied access: ${message}`, 403);
      if (!res.ok) throw new OdooError(`Odoo error ${res.status}: ${message}`, res.status);
      return data;
    }
  }
  return {
    call: async <T,>(model: string, method: string, body: Record<string, unknown> = {}, opts: { once?: boolean } = {}) =>
      (await post(`/json/2/${model}/${method}`, body, !!opts.once)) as T,
    async version() {
      const data = (await post("/web/webclient/version_info", { jsonrpc: "2.0", method: "call", params: {} })) as { result?: { server_version?: string } } | null;
      return data?.result?.server_version ?? "unknown";
    },
  };
}

export async function testConnection(ctx: Ctx, client: OdooClient = jsonClient(ctx)): Promise<string> {
  const context = await client.call<{ uid?: number }>("res.users", "context_get", {});
  const [user] = context.uid ? await client.call<{ name: string }[]>("res.users", "read", { ids: [context.uid], fields: ["name"] }) : [];
  const text = ctx.t("admin.connected", { version: await client.version(), user: user?.name ?? "?" });
  await ctx.store.delete(K.sendPaused);   // spec § 5: a working connection lifts the send pause
  return text;
}
