jest.mock("node:dns/promises", () => ({ lookup: jest.fn() }));

import { lookup } from "node:dns/promises";
import { assertPublicHost, HostNotAllowedError } from "../host-guard";

const mockLookup = lookup as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.MAIL_ALLOW_PRIVATE_HOSTS;
});

it("returns the pinned IP for a host resolving to a public address", async () => {
  mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  const res = await assertPublicHost("mail.example.com");
  expect(res).toEqual({ address: "93.184.216.34", hostname: "mail.example.com" });
});

it("throws when the host resolves to a private address", async () => {
  mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
  await expect(assertPublicHost("evil.example.com")).rejects.toBeInstanceOf(HostNotAllowedError);
});

it("throws when ANY resolved address is disallowed (mixed results / rebinding)", async () => {
  mockLookup.mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
    { address: "169.254.169.254", family: 4 },
  ]);
  await expect(assertPublicHost("rebind.example.com")).rejects.toBeInstanceOf(HostNotAllowedError);
});

it("throws on empty resolution", async () => {
  mockLookup.mockResolvedValue([]);
  await expect(assertPublicHost("nx.example.com")).rejects.toBeInstanceOf(HostNotAllowedError);
});

it("throws when lookup rejects (fail closed)", async () => {
  mockLookup.mockRejectedValue(new Error("ENOTFOUND"));
  await expect(assertPublicHost("nx.example.com")).rejects.toBeInstanceOf(HostNotAllowedError);
});

it("validates a public IP literal without a lookup", async () => {
  const res = await assertPublicHost("8.8.8.8");
  expect(res).toEqual({ address: "8.8.8.8", hostname: "8.8.8.8" });
  expect(mockLookup).not.toHaveBeenCalled();
});

it("throws for a private IP literal", async () => {
  await expect(assertPublicHost("127.0.0.1")).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(mockLookup).not.toHaveBeenCalled();
});

it("bypasses validation when MAIL_ALLOW_PRIVATE_HOSTS=true", async () => {
  process.env.MAIL_ALLOW_PRIVATE_HOSTS = "true";
  const res = await assertPublicHost("mail.internal");
  expect(res).toEqual({ address: "mail.internal", hostname: "mail.internal" });
  expect(mockLookup).not.toHaveBeenCalled();
});
