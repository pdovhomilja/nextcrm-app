// PLUGIN_HTTP_HOST_MAP pins listed hostnames to a fixed IP (e.g. the Docker
// gateway when the instance cannot reach its own public IP). Only those
// hostnames skip the private-address check. Real local server, DNS mocked.
const lookup = jest.fn();
jest.mock("node:dns/promises", () => ({ lookup: (...a: unknown[]) => lookup(...a) }));

import http from "node:http";
import type { AddressInfo } from "node:net";
import { createHttp } from "@/lib/plugins/http";
import { HostNotAllowedError } from "@/lib/net/host-guard";

const log = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
let server: http.Server;
let port: number;
const seen: string[] = [];

beforeAll((done) => {
  server = http
    .createServer((req, res) => {
      seen.push(String(req.headers.host));
      if (req.url === "/hop") {
        res.writeHead(302, { location: `http://intranet.test:${port}/x` });
        res.end();
        return;
      }
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
  delete process.env.PLUGIN_HTTP_HOST_MAP;
});

it("dials the mapped IP for a mapped host and keeps its Host header", async () => {
  process.env.PLUGIN_HTTP_HOST_MAP = "erp.test=127.0.0.1";
  const res = await createHttp(log).fetch(`http://erp.test:${port}/x`);
  expect(await res.text()).toBe("inside");
  expect(seen).toEqual([`erp.test:${port}`]);
  expect(lookup).not.toHaveBeenCalled();
});

it("still refuses a private host that is not in the map", async () => {
  process.env.PLUGIN_HTTP_HOST_MAP = "erp.test=127.0.0.1";
  lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  await expect(createHttp(log).fetch(`http://intranet.test:${port}/x`)).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(seen).toEqual([]);
});

it("refuses a redirect from a mapped host to a private host that is not in the map", async () => {
  process.env.PLUGIN_HTTP_HOST_MAP = "erp.test=127.0.0.1";
  lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  await expect(createHttp(log).fetch(`http://erp.test:${port}/hop`)).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(seen).toEqual([`erp.test:${port}`]);
});

it("ignores an entry whose target is not an IP, with a warning", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  process.env.PLUGIN_HTTP_HOST_MAP = "erp.test=gateway.local";
  lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  await expect(createHttp(log).fetch(`http://erp.test:${port}/x`)).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(seen).toEqual([]);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("erp.test=gateway.local"));
  warn.mockRestore();
});
