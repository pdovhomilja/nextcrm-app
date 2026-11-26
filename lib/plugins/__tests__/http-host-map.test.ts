// PLUGIN_HTTP_HOST_MAP pins listed hostnames to a fixed IP (e.g. the Docker
// gateway when the instance cannot reach its own public IP). Only those
// hostnames, on the scheme's default port, skip the private-address check.
// Real local server, DNS mocked. Redirect cases are in http.test.ts.
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

it("dials the mapped IP on the default port for a mapped host, without DNS", async () => {
  // Nothing listens on 127.0.0.1:80 here: the refused connection shows where it dialled.
  process.env.PLUGIN_HTTP_HOST_MAP = "erp.test=127.0.0.1";
  const err = await createHttp(log).fetch("http://erp.test/x").catch((e: unknown) => e);
  expect(err).not.toBeInstanceOf(HostNotAllowedError);
  expect((err as { cause?: unknown }).cause).toMatchObject({ address: "127.0.0.1", port: 80 });
  expect(lookup).not.toHaveBeenCalled();
});

it("refuses a mapped host on an explicit non-default port", async () => {
  process.env.PLUGIN_HTTP_HOST_MAP = "erp.test=127.0.0.1";
  await expect(createHttp(log).fetch(`http://erp.test:${port}/x`)).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(seen).toEqual([]);
});

it("still refuses a private host that is not in the map", async () => {
  process.env.PLUGIN_HTTP_HOST_MAP = "erp.test=127.0.0.1";
  lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
  await expect(createHttp(log).fetch(`http://intranet.test:${port}/x`)).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(seen).toEqual([]);
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
