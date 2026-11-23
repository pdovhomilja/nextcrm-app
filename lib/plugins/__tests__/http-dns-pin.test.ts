// The plugin HTTP client must connect to an address the host guard accepted.
// A second DNS answer at connect time (a short-TTL name that turns private)
// must not be dialled. Real local server, DNS answers mocked.
const lookup = jest.fn();
jest.mock("node:dns/promises", () => ({ lookup: (...a: unknown[]) => lookup(...a) }));

import http from "node:http";
import type { AddressInfo } from "node:net";
import { createHttp } from "@/lib/plugins/http";

const log = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
let server: http.Server;
let port: number;
const seen: string[] = [];

beforeAll((done) => {
  server = http
    .createServer((req, res) => {
      seen.push(String(req.headers.host));
      res.end("inside");
    })
    .listen(0, "127.0.0.1", () => {
      port = (server.address() as AddressInfo).port;
      done();
    });
});
afterAll((done) => {
  server.closeAllConnections();
  server.close(done);
});
afterEach(() => {
  seen.length = 0;
  lookup.mockReset();
  delete process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS;
});

it("does not connect when the name resolves to a private address after the check", async () => {
  lookup
    .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
    .mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  await expect(createHttp(log).fetch(`http://localhost:${port}/x`)).rejects.toThrow();
  expect(seen).toEqual([]);
});

it("keeps the Host header of the URL", async () => {
  process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS = "true";
  const res = await createHttp(log).fetch(`http://localhost:${port}/x`);
  expect(await res.text()).toBe("inside");
  expect(seen).toEqual([`localhost:${port}`]);
});
