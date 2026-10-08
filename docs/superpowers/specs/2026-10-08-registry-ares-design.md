# registry-ares plugin + VAT check button — design

Date: 2026-10-08. Status: approved in chat by Pavel, awaiting review of this document.
Parent spec: `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (§ 14 lists `registry-ares` as a first plugin).

## 1. Goal

A public, generic plugin that fills a new Czech account from ARES and checks EU VAT numbers in VIES, plus the core button that makes the VAT check reachable from the account forms.

Success: on an instance with the plugin enabled, a user types an IČO in the new-account form, clicks "Load from registry" and gets the company's name, address and DIČ from ARES; in either account form, "Ověřit DIČ" tells the user whether the VAT number is valid, invalid, or cannot be checked right now. Saving is never blocked by either feature.

Non-goals: registry lookup in the edit form, automatic VAT check after a registry load, storing a "verified" flag or date on the account, registries for countries other than CZ.

## 2. Plugin `plugins/registry-ares`

```
plugins/registry-ares/plugin.ts
plugins/registry-ares/ares.ts            IČO normalisation + ARES client + mapping
plugins/registry-ares/vies.ts            VIES client
plugins/registry-ares/messages/{en,cz,de,uk}.json
plugins/registry-ares/__tests__/*.test.ts
```

Definition: id `registry-ares`, permissions `["http"]` only, no settings, no secrets (both APIs are public and keyless). It registers one `companyRegistry` provider.

### 2.1 Lookup (`countries: ["CZ"]`)

1. Normalise the registration number: remove whitespace; it must be 1–8 digits; left-pad with zeros to 8.
2. Validate the IČO checksum (mod 11: weights 8…2 over the first 7 digits, `c = (11 - sum % 11) % 10`, must equal the 8th digit). An invalid number returns `null` without a network call.
3. `GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}` via `ctx.http.fetch`, header `Accept: application/json`.
4. 404 → `null`. Any other non-2xx status or a network error → throw (core logs it in the plugin log and shows its existing "not found" message).
5. Map to `CompanyRecord`:
   - `name` ← `obchodniJmeno`
   - `registrationNumber` ← the normalised IČO
   - `country` ← `"CZ"`
   - `vat` ← `dic` when present
   - `street` ← `nazevUlice` (or, when absent, `nazevCastiObce`) + ` ` + house number, where house number = `cisloDomovni`, followed by `/cisloOrientacni` and `cisloOrientacniPismeno` when present
   - `city` ← `nazevObce`
   - `postalCode` ← `psc` as a string

The ARES response field names above are taken from the public ARES REST documentation; the implementation plan's first step confirms them with one live request and adjusts the mapping if they differ.

### 2.2 `validateVat(vat)` (VIES)

1. Normalise: remove whitespace, dots and dashes, upper-case.
2. Split into a 2-letter country prefix and the number. Greece's VIES code is `EL`; a `GR` prefix is sent as `EL`.
3. Call the VIES REST API (`check-vat-number`) via `ctx.http.fetch`.
4. Return `true` when VIES answers valid, `false` when it answers invalid.
5. Throw when VIES or the member state's service is unavailable (VIES error codes such as `MS_UNAVAILABLE`, `SERVICE_UNAVAILABLE`, `TIMEOUT`, `MS_MAX_CONCURRENT_REQ`, or any non-2xx / network error). A throw means "cannot verify", never "invalid".

The exact VIES endpoint and response shape are confirmed with one live request in the plan's first step.

## 3. Core: "Ověřit DIČ"

### 3.1 Server actions (`actions/crm/accounts/lookup-company.ts`)

- `canValidateVat(): Promise<boolean>`: requires an authenticated user; true when any enabled company registry provider implements `validateVat`.
- `validateVatNumber(vat: string): Promise<{ result: "valid" | "invalid" | "unavailable" | "noProvider" | "noPrefix" }>`:
  1. requires an authenticated user;
  2. after removing whitespace, the value must start with two letters, otherwise `noPrefix`;
  3. picks the first enabled provider that implements `validateVat`, regardless of its `countries` (Pavel, 2026-10-08: `countries` means "who can load company data"; VAT checks are not routed by it); none → `noProvider`;
  4. builds the plugin context inside a `try`, calls `validateVat(vat)`, maps `true`/`false` to `valid`/`invalid`;
  5. any throw → `unavailable`, logged via the plugin's `ctx.log.error` (or `console.error("[VAT_VALIDATE]")` when the context was never built).

No SDK change: `CompanyRegistryProvider.validateVat?` already exists.

### 3.2 UI

- `NewAccountForm.tsx` and `UpdateAccountForm.tsx`: a small "Ověřit DIČ" button next to the VAT field, shown only when `canValidateVat()` returned true (loaded once on mount, same pattern as `getRegistryCountries`).
- The button is disabled while the check runs and while the field is empty; it re-enables in `finally`.
- Result as a toast: valid → success, invalid → error, unavailable → warning "cannot verify right now", noPrefix → error asking for the country code (e.g. CZ12345678), noProvider → error.
- Saving the form is never affected.

### 3.3 Messages

New keys under `Plugins.*` in `messages/{en,cz,de,uk}.json`: button label, one message per result.

## 4. Testing

- Plugin unit tests with `createTestContext` and a mocked `ctx.http`: IČO normalisation and checksum (valid, invalid, short with padding, non-digits), ARES mapping (street with and without orientation number and letter, missing street → part of town, missing DIČ), 404 → `null`, 500 → throw, VIES valid / invalid / unavailable → throw, `GR` → `EL`.
- Core action tests: `noPrefix`, `noProvider`, provider picked regardless of `countries`, valid / invalid, throw → `unavailable` with logging, context-build failure → `unavailable`; `canValidateVat` true/false.
- The existing plugin contract test covers the new plugin's manifest, translations, id builders and boundaries; `plugins.generated.ts` is regenerated with `pnpm plugins:generate --public-only` and committed.
- Manual check after deploy: enable the plugin on a test instance, load a real IČO, check one valid and one invalid DIČ.

## 5. Risks

- ARES and VIES availability: both are public services with outages; lookup failures fall back to the existing "not found" message, VAT failures to "cannot verify right now". Nothing blocks saving.
- VIES rate limiting (`MS_MAX_CONCURRENT_REQ`): treated as unavailable; one check per click, no retries.
- `billing_country` is filled with the localised country name (from the hardening PR); unchanged here.
