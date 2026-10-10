/** A fetch for createTestContext that answers Odoo JSON-2 calls from handlers keyed "model/method". */
export type Handler = (body: Record<string, any>) => unknown | Response;
export function fakeOdoo(handlers: Record<string, Handler>, calls: { path: string; body: any; headers: Record<string, string> }[] = []) {
  return async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ path, body, headers: (init?.headers ?? {}) as Record<string, string> });
    const key = path.startsWith("/json/2/") ? path.slice(8) : path;
    const h = handlers[key];
    if (!h) return new Response(JSON.stringify({ message: `no handler for ${key}` }), { status: 404 });
    const out = h(body);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
  };
}
