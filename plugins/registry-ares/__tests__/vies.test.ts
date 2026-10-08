import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { validateVies } from "../vies";

const URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const viesError = (code: string) => json(200, { actionSucceed: false, errorWrappers: [{ error: code }] });

it("posts the normalised number and returns VIES's verdict", async () => {
  const fetch = jest.fn(async (_url: string, _init?: RequestInit) => json(200, { valid: true }));
  await expect(validateVies("cz 270.824-40", createTestContext({ fetch }))).resolves.toBe(true);
  expect(fetch).toHaveBeenCalledWith(URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ countryCode: "CZ", vatNumber: "27082440" }),
  });
  await expect(validateVies("CZ99999999", createTestContext({ fetch: async () => json(200, { valid: false }) }))).resolves.toBe(false);
});

it("sends Greek numbers as EL", async () => {
  const fetch = jest.fn(async (_url: string, _init?: RequestInit) => json(200, { valid: true }));
  await validateVies("GR094014201", createTestContext({ fetch }));
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ countryCode: "EL", vatNumber: "094014201" });
});

it("treats INVALID_INPUT and a missing prefix as invalid", async () => {
  await expect(validateVies("CZ12", createTestContext({ fetch: async () => viesError("INVALID_INPUT") }))).resolves.toBe(false);
  const fetch = jest.fn(async (_url: string, _init?: RequestInit) => json(200, { valid: true }));
  await expect(validateVies("27082440", createTestContext({ fetch }))).resolves.toBe(false);
  await expect(validateVies("CZ", createTestContext({ fetch }))).resolves.toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});

it("throws for prefixes VIES does not cover, without calling it", async () => {
  const fetch = jest.fn(async (_url: string, _init?: RequestInit) => viesError("INVALID_INPUT"));
  await expect(validateVies("GB980780684", createTestContext({ fetch }))).rejects.toThrow("VIES does not cover GB");
  await expect(validateVies("CHE-116.281.710", createTestContext({ fetch }))).rejects.toThrow("VIES does not cover CH");
  expect(fetch).not.toHaveBeenCalled();
});

it("throws when VIES cannot answer", async () => {
  for (const code of ["MS_UNAVAILABLE", "SERVICE_UNAVAILABLE", "TIMEOUT", "MS_MAX_CONCURRENT_REQ"]) {
    await expect(validateVies("CZ27082440", createTestContext({ fetch: async () => viesError(code) }))).rejects.toThrow(code);
  }
  await expect(validateVies("CZ27082440", createTestContext({ fetch: async () => json(503, {}) }))).rejects.toThrow("VIES responded 503");
});
