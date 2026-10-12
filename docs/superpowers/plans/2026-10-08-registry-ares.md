# registry-ares Plugin + VAT Check Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first real NextCRM plugin, `registry-ares` (ARES lookup for CZ, VIES VAT check), plus the core "Ověřit DIČ" button that calls any enabled provider's `validateVat`.

**Architecture:** The plugin lives in `plugins/registry-ares/` and is split into three small files: an ARES client with IČO normalisation, a VIES client, and the `definePlugin` wiring. Core gets two server actions next to `lookupCompany`. A shared client component `VatCheckButton` is used by both account forms. The SDK stays unchanged.

**Tech Stack:** Next.js 16 server actions, `@nextcrm/plugin-sdk` 0.1 (`definePlugin`, `createTestContext`), jest 30 + ts-jest (node environment), next-intl, sonner toasts.

**Spec:** `docs/superpowers/specs/2026-10-08-registry-ares-design.md`

## Global Constraints

- Plugin id `registry-ares`, version `0.1.0`, sdk `^0.1.0`, permissions `["http"]` only, no settings, no secrets.
- The plugin imports only `@nextcrm/plugin-sdk` and files inside `plugins/registry-ares/` (enforced by `__tests__/plugins/boundaries.test.ts`).
- All network calls go through `ctx.http.fetch` (15 s default timeout, host guard). Never use global `fetch` in the plugin.
- ARES endpoint: `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}` (GET, `Accept: application/json`).
- VIES endpoint: `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number` (POST JSON `{ countryCode, vatNumber }`).
- No SDK change: `CompanyRegistryProvider.validateVat?` is used as it is.
- `validateVatNumber` picks the first enabled provider that implements `validateVat`, whatever its `countries` (Pavel, 2026-10-08).
- Neither feature ever blocks saving an account.
- A VAT check that cannot be completed is reported as "cannot verify right now", never as "invalid".
- NextCRM is a generic product: no client-specific names, IDs or logic.
- Core messages go in `locales/{en,cz,de,uk}.json` under `Plugins`. Plugin messages go in `plugins/registry-ares/messages/{en,cz,de,uk}.json`. All four locales are required and must have the same keys.
- Test command: `pnpm exec jest <paths>`. Full suite: `pnpm exec jest --testPathIgnorePatterns "__tests__/invoices/lifecycle"`. Three suites fail on main and are a known baseline: enrich-target-job, enrich-contact-job, google-sync-classify.

## Decisions from the live probe (2026-10-08)

One real request was made to each API while writing this plan.
- **ARES:** `GET …/27082440` returned `ico`, `obchodniJmeno`, `dic` and `sidlo` with `nazevUlice`, `cisloDomovni` (number), `cisloOrientacni` (number), `nazevCastiObce`, `nazevObce`, `psc` (number, e.g. `17000`). An IČO that does not exist returns HTTP 404. The spec's mapping holds. `postalCode` is `String(psc)`.
- **VIES success:** HTTP 200 `{ "valid": true|false, "name": …, … }`. `EL` works for Greece.
- **VIES errors:** HTTP 200 `{ "actionSucceed": false, "errorWrappers": [{ "error": "<CODE>" }] }`. `INVALID_INPUT` (a malformed number) is reported as **invalid** (`false`). Every other error code, any non-2xx status and any network error **throws** ("cannot verify"). This refines spec § 2.2, which did not list `INVALID_INPUT`.

## Review Focus

1. **VAT typed with spaces, dots, dashes or in lower case** (`cz 270.824-40`) → it is normalised and checked, not reported as invalid. Tests in Task 2 and Task 4.
2. **IČO typed without its leading zeros** (`19` for `00000019`) → it is padded to 8 digits and looked up. Test in Task 1.
3. **Garbage after a valid prefix** (`CZ12`): VIES answers `INVALID_INPUT` → the user sees "invalid", not "cannot verify". Test in Task 2.
4. **Companies in villages with no street name** → the street is built from the part of town and the house number. Test in Task 1.
5. **Existing account with no VAT number** (`vat` is `null` in the edit form) → the button is disabled and nothing crashes. This is enforced by the `vat?: string | null` prop type in Task 5 and checked manually in Task 5 Step 6.

---

### Task 1: ARES client with IČO normalisation

**Files:**
- Create: `plugins/registry-ares/ares.ts`
- Test: `plugins/registry-ares/__tests__/ares.test.ts`

**Interfaces:**
- Produces:
  - `normalizeIco(input: string): string | null`
  - `mapAres(subject: AresSubject, ico: string): CompanyRecord`
  - `lookupAres(registrationNumber: string, ctx: Pick<PluginContext, "http">): Promise<CompanyRecord | null>`
- Task 3 imports `lookupAres`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest plugins/registry-ares/__tests__/ares.test.ts`
Expected: FAIL with `Cannot find module '../ares'`.

- [ ] **Step 3: Write the implementation**

```ts
import type { CompanyRecord, PluginContext } from "@nextcrm/plugin-sdk";

const ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/";

// IČO: up to 8 digits, left-padded; mod-11 checksum over the first 7 (weights 8..2).
export function normalizeIco(input: string): string | null {
  const s = input.replace(/\s+/g, "");
  if (!/^\d{1,8}$/.test(s)) return null;
  const ico = s.padStart(8, "0");
  const sum = [...ico.slice(0, 7)].reduce((acc, d, i) => acc + Number(d) * (8 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(ico[7]) ? ico : null;
}

interface AresSidlo {
  nazevUlice?: string;
  nazevCastiObce?: string;
  cisloDomovni?: number;
  cisloOrientacni?: number;
  cisloOrientacniPismeno?: string;
  nazevObce?: string;
  psc?: number;
}

export interface AresSubject {
  ico: string;
  obchodniJmeno: string;
  dic?: string;
  sidlo?: AresSidlo;
}

export function mapAres(subject: AresSubject, ico: string): CompanyRecord {
  const a = subject.sidlo ?? {};
  const orientation = a.cisloOrientacni === undefined ? "" : `/${a.cisloOrientacni}${a.cisloOrientacniPismeno ?? ""}`;
  const house = a.cisloDomovni === undefined ? "" : `${a.cisloDomovni}${orientation}`;
  const street = [a.nazevUlice ?? a.nazevCastiObce, house].filter(Boolean).join(" ");
  return {
    name: subject.obchodniJmeno,
    registrationNumber: ico,
    country: "CZ",
    ...(subject.dic ? { vat: subject.dic } : {}),
    ...(street ? { street } : {}),
    ...(a.nazevObce ? { city: a.nazevObce } : {}),
    ...(a.psc !== undefined ? { postalCode: String(a.psc) } : {}),
  };
}

export async function lookupAres(registrationNumber: string, ctx: Pick<PluginContext, "http">): Promise<CompanyRecord | null> {
  const ico = normalizeIco(registrationNumber);
  if (!ico) return null;
  const res = await ctx.http.fetch(ARES_URL + ico, { headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ARES responded ${res.status}`);
  return mapAres((await res.json()) as AresSubject, ico);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec jest plugins/registry-ares/__tests__/ares.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/registry-ares/ares.ts plugins/registry-ares/__tests__/ares.test.ts
git commit -m "feat(registry-ares): ARES client with IČO checksum and address mapping"
```

---

### Task 2: VIES client

**Files:**
- Create: `plugins/registry-ares/vies.ts`
- Test: `plugins/registry-ares/__tests__/vies.test.ts`

**Interfaces:**
- Produces: `validateVies(vat: string, ctx: Pick<PluginContext, "http">): Promise<boolean>`. It returns `true` (valid) or `false` (invalid, including `INVALID_INPUT` and a missing prefix), and throws when VIES cannot answer.
- Task 3 imports `validateVies`.

- [ ] **Step 1: Write the failing test**

```ts
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

it("throws when VIES cannot answer", async () => {
  for (const code of ["MS_UNAVAILABLE", "SERVICE_UNAVAILABLE", "TIMEOUT", "MS_MAX_CONCURRENT_REQ"]) {
    await expect(validateVies("CZ27082440", createTestContext({ fetch: async () => viesError(code) }))).rejects.toThrow(code);
  }
  await expect(validateVies("CZ27082440", createTestContext({ fetch: async () => json(503, {}) }))).rejects.toThrow("VIES responded 503");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest plugins/registry-ares/__tests__/vies.test.ts`
Expected: FAIL with `Cannot find module '../vies'`.

- [ ] **Step 3: Write the implementation**

```ts
import type { PluginContext } from "@nextcrm/plugin-sdk";

const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

interface ViesReply {
  valid?: boolean;
  errorWrappers?: { error?: string }[];
}

// true = valid, false = invalid; throws when VIES cannot answer ("cannot verify", never "invalid").
export async function validateVies(vat: string, ctx: Pick<PluginContext, "http">): Promise<boolean> {
  const v = vat.replace(/[\s.-]/g, "").toUpperCase();
  const prefix = v.slice(0, 2);
  const number = v.slice(2);
  if (!/^[A-Z]{2}$/.test(prefix) || !number) return false;
  const res = await ctx.http.fetch(VIES_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ countryCode: prefix === "GR" ? "EL" : prefix, vatNumber: number }),
  });
  if (!res.ok) throw new Error(`VIES responded ${res.status}`);
  const reply = (await res.json()) as ViesReply;
  if (typeof reply.valid === "boolean") return reply.valid;
  const code = reply.errorWrappers?.[0]?.error ?? "UNKNOWN";
  if (code === "INVALID_INPUT") return false;
  throw new Error(`VIES unavailable: ${code}`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec jest plugins/registry-ares/__tests__/vies.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/registry-ares/vies.ts plugins/registry-ares/__tests__/vies.test.ts
git commit -m "feat(registry-ares): VIES VAT check, unavailable answers throw"
```

---

### Task 3: Plugin definition, messages and registry

**Files:**
- Create: `plugins/registry-ares/plugin.ts`
- Create: `plugins/registry-ares/messages/en.json`, `cz.json`, `de.json`, `uk.json`
- Modify: `lib/plugins/plugins.generated.ts` (regenerated by script, do not hand-edit)
- Test: `plugins/registry-ares/__tests__/plugin.test.ts`

**Interfaces:**
- Consumes: `lookupAres` (Task 1), `validateVies` (Task 2).
- Produces: the default export `PluginDefinition` with id `registry-ares` and one `companyRegistry` provider `{ countries: ["CZ"], lookup, validateVat }`.

- [ ] **Step 1: Write the failing test**

```ts
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import plugin from "../plugin";

it("declares only the http permission and one CZ provider", () => {
  expect(plugin.id).toBe("registry-ares");
  expect(plugin.permissions).toEqual(["http"]);
  expect(plugin.extensions.companyRegistries).toHaveLength(1);
  expect(plugin.extensions.companyRegistries[0].countries).toEqual(["CZ"]);
});

it("wires lookup to ARES and validateVat to VIES", async () => {
  const fetch = jest.fn(async (url: string, _init?: RequestInit) =>
    new Response(JSON.stringify(url.includes("ares.gov.cz") ? { ico: "27082440", obchodniJmeno: "Alza.cz a.s." } : { valid: true }), { status: 200 }));
  const ctx = createTestContext({ pluginId: "registry-ares", fetch });
  const [provider] = plugin.extensions.companyRegistries;
  await expect(provider.lookup("27082440", "CZ", ctx)).resolves.toEqual({ name: "Alza.cz a.s.", registrationNumber: "27082440", country: "CZ" });
  await expect(provider.validateVat!("CZ27082440", ctx)).resolves.toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest plugins/registry-ares/__tests__/plugin.test.ts`
Expected: FAIL with `Cannot find module '../plugin'`.

- [ ] **Step 3: Write the plugin and its messages**

`plugins/registry-ares/plugin.ts`:

```ts
import { definePlugin } from "@nextcrm/plugin-sdk";
import { lookupAres } from "./ares";
import { validateVies } from "./vies";

export default definePlugin({
  id: "registry-ares",
  name: "Company registry (ARES, VIES)",
  version: "0.1.0",
  sdk: "^0.1.0",
  description: "Loads Czech companies from ARES and checks EU VAT numbers in VIES.",
  permissions: ["http"],
  extensions: (x) => {
    x.companyRegistry({
      countries: ["CZ"],
      lookup: (registrationNumber, _country, ctx) => lookupAres(registrationNumber, ctx),
      validateVat: (vat, ctx) => validateVies(vat, ctx),
    });
  },
});
```

`plugins/registry-ares/messages/en.json`: `{ "name": "Company registry (ARES, VIES)" }`
`plugins/registry-ares/messages/cz.json`: `{ "name": "Registr firem (ARES, VIES)" }`
`plugins/registry-ares/messages/de.json`: `{ "name": "Firmenregister (ARES, VIES)" }`
`plugins/registry-ares/messages/uk.json`: `{ "name": "Реєстр компаній (ARES, VIES)" }`

- [ ] **Step 4: Regenerate the registry**

Run: `pnpm plugins:generate --public-only`
Expected: `lib/plugins/plugins.generated.ts` now imports `@/plugins/registry-ares/plugin` and its four message files, with one entry `{ source: "public", definition: …, messages: { en, cz, de, uk } }`.

- [ ] **Step 5: Run the plugin, contract, boundary and registry tests**

Run: `pnpm exec jest plugins/registry-ares __tests__/plugins lib/plugins/__tests__/registry.test.ts`
Expected: PASS, including `plugin registry-ares › meets the plugin contract`.

- [ ] **Step 6: Run the full suite and tsc**

Run: `pnpm exec jest --testPathIgnorePatterns "__tests__/invoices/lifecycle"` and `pnpm exec tsc --noEmit`
Expected: only the three baseline suites fail; tsc exits 0. The registry is no longer empty, so suites that build Inngest functions or slots from the real registry now see one plugin. Fix only test assumptions that this plan's plugin breaks, and report each one.

- [ ] **Step 7: Commit**

```bash
git add plugins/registry-ares/plugin.ts plugins/registry-ares/messages plugins/registry-ares/__tests__/plugin.test.ts lib/plugins/plugins.generated.ts
git commit -m "feat(registry-ares): plugin definition, messages, registry entry"
```

---

### Task 4: Core VAT-check server actions

**Files:**
- Modify: `actions/crm/accounts/lookup-company.ts` (append two actions and one type)
- Test: create `actions/crm/accounts/__tests__/validate-vat.test.ts`

**Interfaces:**
- Consumes: `getCompanyRegistryProviders()` from `@/lib/plugins/slots`, which returns `{ plugin: RegisteredPlugin; provider: CompanyRegistryProvider }[]`, and `createPluginContext` from `@/lib/plugins/context` (same call shape as `lookupCompany`).
- Produces:
  - `canValidateVat(): Promise<boolean>`
  - `type VatCheckResult = "valid" | "invalid" | "unavailable" | "noProvider" | "noPrefix"`
  - `validateVatNumber(vat: string): Promise<{ result: VatCheckResult }>`
- Task 5 imports all three.

- [ ] **Step 1: Write the failing test**

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1", role: "user" })),
  AuthenticationError: class AuthenticationError extends Error {},
}));
const mockProviders: { plugin: unknown; provider: Record<string, unknown> }[] = [];
jest.mock("@/lib/plugins/slots", () => ({ getCompanyRegistryProviders: jest.fn(async () => mockProviders) }));
const mockLogError = jest.fn();
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ log: { error: mockLogError } })) }));
jest.mock("next-intl/server", () => ({ getTranslations: jest.fn(async () => (k: string) => k) }));
import { canValidateVat, validateVatNumber } from "@/actions/crm/accounts/lookup-company";

const lookup = jest.fn();
const validateVat = jest.fn();
const plugin = { definition: { id: "registry-x" } };

beforeEach(() => {
  mockProviders.length = 0;
  validateVat.mockReset();
  mockLogError.mockReset();
});

it("canValidateVat is true only when an enabled provider implements validateVat", async () => {
  mockProviders.push({ plugin, provider: { countries: ["SK"], lookup } });
  await expect(canValidateVat()).resolves.toBe(false);
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  await expect(canValidateVat()).resolves.toBe(true);
});

it("asks for the country code before calling any provider", async () => {
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  await expect(validateVatNumber("27082440")).resolves.toEqual({ result: "noPrefix" });
  await expect(validateVatNumber("  ")).resolves.toEqual({ result: "noPrefix" });
  expect(validateVat).not.toHaveBeenCalled();
});

it("reports noProvider when no enabled provider can validate", async () => {
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup } });
  await expect(validateVatNumber("CZ27082440")).resolves.toEqual({ result: "noProvider" });
});

it("uses a provider whatever its countries and maps true/false", async () => {
  mockProviders.push({ plugin, provider: { countries: ["SK"], lookup } });
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  validateVat.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(validateVatNumber("DE 123 456 789")).resolves.toEqual({ result: "valid" });
  expect(validateVat).toHaveBeenCalledWith("DE123456789", { log: { error: mockLogError } });
  await expect(validateVatNumber("DE123456789")).resolves.toEqual({ result: "invalid" });
});

it("reports unavailable and logs when the provider throws", async () => {
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  validateVat.mockRejectedValueOnce(new Error("VIES unavailable: MS_UNAVAILABLE"));
  await expect(validateVatNumber("CZ27082440")).resolves.toEqual({ result: "unavailable" });
  expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining("MS_UNAVAILABLE"));
});

it("reports unavailable when the plugin context cannot be built", async () => {
  mockProviders.push({ plugin, provider: { countries: ["CZ"], lookup, validateVat } });
  const { createPluginContext } = jest.requireMock("@/lib/plugins/context");
  createPluginContext.mockRejectedValueOnce(new Error("state unavailable"));
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(validateVatNumber("CZ27082440")).resolves.toEqual({ result: "unavailable" });
  expect(spy).toHaveBeenCalledWith("[VAT_VALIDATE]", expect.any(Error));
  spy.mockRestore();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec jest actions/crm/accounts/__tests__/validate-vat.test.ts`
Expected: FAIL. `canValidateVat` / `validateVatNumber` are not exported (`is not a function`).

- [ ] **Step 3: Append the actions to `actions/crm/accounts/lookup-company.ts`**

```ts
export async function canValidateVat(): Promise<boolean> {
  await requireAuthenticated();
  return (await getCompanyRegistryProviders()).some((r) => typeof r.provider.validateVat === "function");
}

export type VatCheckResult = "valid" | "invalid" | "unavailable" | "noProvider" | "noPrefix";

// Any enabled provider with validateVat answers, whatever its countries: countries only
// says who can load company data. A throw means "cannot verify", never "invalid".
export async function validateVatNumber(vat: string): Promise<{ result: VatCheckResult }> {
  const user = await requireAuthenticated();
  const value = vat.replace(/\s+/g, "");
  if (!/^[A-Za-z]{2}/.test(value)) return { result: "noPrefix" };
  const found = (await getCompanyRegistryProviders()).find((r) => typeof r.provider.validateVat === "function");
  if (!found?.provider.validateVat) return { result: "noProvider" };
  let ctx: Awaited<ReturnType<typeof createPluginContext>> | undefined;
  try {
    ctx = await createPluginContext({ plugin: found.plugin as never, actor: { type: "user", userId: user.id, role: user.role } });
    return { result: (await found.provider.validateVat(value, ctx)) ? "valid" : "invalid" };
  } catch (e) {
    if (ctx) ctx.log.error(`VAT validation failed: ${String(e)}`);
    else console.error("[VAT_VALIDATE]", e);
    return { result: "unavailable" };
  }
}
```

- [ ] **Step 4: Run the new and the existing lookup tests**

Run: `pnpm exec jest actions/crm/accounts/__tests__/validate-vat.test.ts actions/crm/accounts/__tests__/lookup-company.test.ts`
Expected: PASS (both files).

- [ ] **Step 5: Commit**

```bash
git add actions/crm/accounts/lookup-company.ts actions/crm/accounts/__tests__/validate-vat.test.ts
git commit -m "feat(accounts): VAT check actions over any provider with validateVat"
```

---

### Task 5: "Ověřit DIČ" button in both account forms

**Files:**
- Create: `app/[locale]/(routes)/crm/accounts/components/VatCheckButton.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx` (the `vat` `FormField`, ~line 229)
- Modify: `app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx` (the `vat` `FormField`, ~line 246)
- Modify: `locales/en.json`, `locales/cz.json`, `locales/de.json`, `locales/uk.json` (`Plugins` namespace)

**Interfaces:**
- Consumes: `canValidateVat`, `validateVatNumber` and `VatCheckResult` from `@/actions/crm/accounts/lookup-company` (Task 4).
- Produces: `VatCheckButton({ vat }: { vat?: string | null })`, a client component that renders nothing when no provider can validate.

The repo has no React component test setup (jest runs in the `node` environment, with no testing-library), so this task is verified with tsc, eslint, the locale tests and the manual check in Step 6.

- [ ] **Step 1: Add the messages**

Add these keys to the `Plugins` object in each locale file, next to `loadFromRegistry`:

| key | en | cz | de | uk |
|---|---|---|---|---|
| `checkVat` | Check VAT number | Ověřit DIČ | USt-IdNr. prüfen | Перевірити ПДВ-номер |
| `vatValid` | VAT number is valid (VIES). | DIČ je platné (VIES). | USt-IdNr. ist gültig (VIES). | ПДВ-номер дійсний (VIES). |
| `vatInvalid` | VAT number is not valid (VIES). | DIČ není platné (VIES). | USt-IdNr. ist ungültig (VIES). | ПДВ-номер недійсний (VIES). |
| `vatUnavailable` | VAT number cannot be verified right now. Try again later. | DIČ teď nejde ověřit. Zkuste to později. | USt-IdNr. kann gerade nicht geprüft werden. Bitte später erneut versuchen. | ПДВ-номер зараз неможливо перевірити. Спробуйте пізніше. |
| `vatNoPrefix` | Enter the VAT number with its country code, e.g. CZ12345678. | Zadejte DIČ s kódem země, např. CZ12345678. | Geben Sie die USt-IdNr. mit Ländercode ein, z. B. CZ12345678. | Введіть ПДВ-номер з кодом країни, напр. CZ12345678. |
| `vatNoProvider` | No VAT check is available. | Ověření DIČ není k dispozici. | Keine USt-IdNr.-Prüfung verfügbar. | Перевірка ПДВ-номера недоступна. |

- [ ] **Step 2: Create `VatCheckButton.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canValidateVat, validateVatNumber, type VatCheckResult } from "@/actions/crm/accounts/lookup-company";

const MESSAGE: Record<VatCheckResult, string> = {
  valid: "vatValid",
  invalid: "vatInvalid",
  unavailable: "vatUnavailable",
  noPrefix: "vatNoPrefix",
  noProvider: "vatNoProvider",
};

// Informs only; never blocks saving the form.
export function VatCheckButton({ vat }: { vat?: string | null }) {
  const p = useTranslations("Plugins");
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    canValidateVat().then(setAvailable).catch(() => {});
  }, []);
  if (!available) return null;

  const check = async () => {
    if (!vat?.trim()) return;
    setChecking(true);
    let result: VatCheckResult;
    try {
      result = (await validateVatNumber(vat)).result;
    } catch {
      result = "unavailable";
    } finally {
      setChecking(false);
    }
    const message = p(MESSAGE[result]);
    if (result === "valid") toast.success(message);
    else if (result === "unavailable") toast.warning(message);
    else toast.error(message);
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={checking || !vat?.trim()} onClick={check}>
      {p("checkVat")}
    </Button>
  );
}
```

- [ ] **Step 3: Use it in both forms**

In `NewAccountForm.tsx` and `UpdateAccountForm.tsx`, add the import
`import { VatCheckButton } from "./VatCheckButton";`
and insert `<VatCheckButton vat={field.value} />` in the `vat` field between `</FormControl>` and `<FormMessage />`. It must stay outside `FormControl`, because `FormControl` slots its single child:

```tsx
                  <FormControl>
                    <Input
                      disabled={form.formState.isSubmitting}
                      placeholder="CZ1234567890"
                      {...field}
                    />
                  </FormControl>
                  <VatCheckButton vat={field.value} />
                  <FormMessage />
```

- [ ] **Step 4: Static checks**

Run: `pnpm exec tsc --noEmit`, then `pnpm exec eslint "app/[locale]/(routes)/crm/accounts/components/VatCheckButton.tsx" "app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx" "app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx"`, and `pnpm exec jest lib/plugins/__tests__/i18n.test.ts __tests__/plugins`
Expected: all exit 0 / PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(routes)/crm/accounts/components/VatCheckButton.tsx" "app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx" "app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx" locales/en.json locales/cz.json locales/de.json locales/uk.json
git commit -m "feat(accounts): Ověřit DIČ button in new and edit account forms"
```

- [ ] **Step 6: Manual check (controller, with Pavel, on local dev)**

1. Enable `registry-ares` in Administration → Plugins.
2. New account: type `27082440`, click "Load from registry". Expected: Alza.cz a.s., `Jankovcova 1522/53`, Praha, `17000`, DIČ `CZ27082440`.
3. Click "Ověřit DIČ". Expected: valid toast.
4. Change the VAT to `CZ99999999`. Expected: invalid toast. Change it to `27082440`. Expected: country-code toast.
5. Edit an account with an empty VAT. Expected: the button is visible and disabled.
6. Disable the plugin. Expected: both buttons are gone.
