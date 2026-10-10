import type { Ctx } from "./settings";

export class OdooError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "OdooError"; }
}
export class OdooAuthError extends OdooError {
  constructor(status: number) { super("Odoo rejected the API key", status); this.name = "OdooAuthError"; }
}

/** Spec § 3.1: the transport behind an interface, so an XML-RPC client could replace JSON-2. */
export interface OdooClient {
  call<T = unknown>(model: string, method: string, body?: Record<string, unknown>): Promise<T>;
  version(): Promise<string>;
}

type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BACKOFF = [2000, 4000];   // 3 attempts in total

export function jsonClient(ctx: Ctx, sleep: Sleep = realSleep): OdooClient {
  const base = ctx.settings.url.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", Authorization: `bearer ${ctx.secrets.apiKey}`, "X-Odoo-Database": ctx.settings.database };
  async function post(path: string, body: unknown): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await ctx.http.fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body), timeoutMs: 30_000 });
      } catch (e) {
        if (attempt >= BACKOFF.length) throw new OdooError(`Odoo unreachable: ${String(e)}`, 0);
        await sleep(BACKOFF[attempt]);
        continue;
      }
      if (res.status === 401) throw new OdooAuthError(res.status);
      if (res.status >= 500) {
        if (attempt >= BACKOFF.length) throw new OdooError(`Odoo error ${res.status}`, res.status);
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
    call: async <T,>(model: string, method: string, body: Record<string, unknown> = {}) => (await post(`/json/2/${model}/${method}`, body)) as T,
    async version() {
      const data = (await post("/web/webclient/version_info", { jsonrpc: "2.0", method: "call", params: {} })) as { result?: { server_version?: string } } | null;
      return data?.result?.server_version ?? "unknown";
    },
  };
}

export async function testConnection(ctx: Ctx, client: OdooClient = jsonClient(ctx)): Promise<string> {
  const context = await client.call<{ uid?: number }>("res.users", "context_get", {});
  const [user] = context.uid ? await client.call<{ name: string }[]>("res.users", "read", { ids: [context.uid], fields: ["name"] }) : [];
  return ctx.t("admin.connected", { version: await client.version(), user: user?.name ?? "?" });
}
