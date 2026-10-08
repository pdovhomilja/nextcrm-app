import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { lookupAres, mapAres, normalizeIco } from "../ares";

const ALZA = {
  ico: "27082440",
  obchodniJmeno: "Alza.cz a.s.",
  dic: "CZ27082440",
  sidlo: { nazevObce: "Praha", nazevCastiObce: "Holešovice", nazevUlice: "Jankovcova", cisloDomovni: 1522, cisloOrientacni: 53, psc: 17000 },
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("normalizeIco", () => {
  it.each([
    ["27082440", "27082440"],
    [" 2708 2440 ", "27082440"],
    ["19", "00000019"],
  ])("accepts %p", (input, expected) => expect(normalizeIco(input)).toBe(expected));

  it.each(["27082441", "", "123456789", "2708244a", "CZ27082440"])("rejects %p", (input) =>
    expect(normalizeIco(input)).toBeNull());
});

describe("mapAres", () => {
  it("maps name, DIČ and the full address", () => {
    expect(mapAres(ALZA, "27082440")).toEqual({
      name: "Alza.cz a.s.",
      registrationNumber: "27082440",
      country: "CZ",
      vat: "CZ27082440",
      street: "Jankovcova 1522/53",
      city: "Praha",
      postalCode: "17000",
    });
  });

  it("adds the orientation letter and falls back to the part of town without a street", () => {
    expect(mapAres({ ...ALZA, sidlo: { ...ALZA.sidlo, cisloOrientacniPismeno: "a" } }, "27082440").street).toBe("Jankovcova 1522/53a");
    expect(mapAres({ ...ALZA, sidlo: { nazevCastiObce: "Lhota", cisloDomovni: 12, nazevObce: "Lhota" } }, "27082440").street).toBe("Lhota 12");
  });

  it("omits DIČ and address fields ARES does not return", () => {
    expect(mapAres({ ico: "00000019", obchodniJmeno: "X" }, "00000019")).toEqual({
      name: "X",
      registrationNumber: "00000019",
      country: "CZ",
    });
  });
});

describe("lookupAres", () => {
  it("calls ARES with the padded IČO and maps the reply", async () => {
    const fetch = jest.fn(async (_url: string, _init?: RequestInit) => json(200, ALZA));
    const ctx = createTestContext({ fetch });
    await expect(lookupAres("27082440", ctx)).resolves.toMatchObject({ name: "Alza.cz a.s.", registrationNumber: "27082440" });
    expect(fetch).toHaveBeenCalledWith(
      "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/27082440",
      { headers: { Accept: "application/json" } },
    );
  });

  it("returns null without a request for an invalid IČO", async () => {
    const fetch = jest.fn(async (_url: string, _init?: RequestInit) => json(200, ALZA));
    await expect(lookupAres("27082441", createTestContext({ fetch }))).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns null on 404 and throws on other errors", async () => {
    await expect(lookupAres("19", createTestContext({ fetch: async () => json(404, {}) }))).resolves.toBeNull();
    await expect(lookupAres("19", createTestContext({ fetch: async () => json(500, {}) }))).rejects.toThrow("ARES responded 500");
  });
});
