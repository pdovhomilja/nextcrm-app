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
