const lookup = jest.fn();
jest.mock("node:dns/promises", () => ({ lookup: (...a: unknown[]) => lookup(...a) }));
import { createHttp } from "@/lib/plugins/http";
import { HostNotAllowedError } from "@/lib/net/host-guard";

const log = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; delete process.env.MAIL_ALLOW_PRIVATE_HOSTS; delete process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS; jest.clearAllMocks(); });

it("MAIL_ALLOW_PRIVATE_HOSTS does not open the plugin guard (M7)", async () => {
  process.env.MAIL_ALLOW_PRIVATE_HOSTS = "true";
  global.fetch = jest.fn() as never;
  await expect(createHttp(log).fetch("http://127.0.0.1/x")).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(global.fetch).not.toHaveBeenCalled();
});

it("re-checks every redirect target (M7)", async () => {
  lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  global.fetch = jest.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } })) as never;
  await expect(createHttp(log).fetch("https://example.com/a")).rejects.toBeInstanceOf(HostNotAllowedError);
  expect((global.fetch as jest.Mock).mock.calls[0][1].redirect).toBe("manual");
});

it("follows public redirects up to 5 hops", async () => {
  lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/b" } }))
    .mockResolvedValueOnce(new Response("ok", { status: 200 }));
  global.fetch = fetchMock as never;
  const res = await createHttp(log).fetch("https://example.com/a");
  expect(res.status).toBe(200);
  expect(fetchMock.mock.calls[1][0]).toBe("https://example.com/b");
});
