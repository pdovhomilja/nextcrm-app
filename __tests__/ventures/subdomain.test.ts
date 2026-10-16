import {
  adminHostForKey,
  defaultAdminUrl,
  defaultErpUrl,
  erpHostForKey,
  isValidVentureKey,
  normalizeVentureKey,
} from "@/lib/ventures/subdomain";

describe("venture subdomain helpers", () => {
  it("normalizes venture keys", () => {
    expect(normalizeVentureKey("  ROFYT  ")).toBe("rofyt");
    expect(normalizeVentureKey("RO FABS")).toBe("ro-fabs");
  });

  it("validates keys", () => {
    expect(isValidVentureKey("rofyt")).toBe(true);
    expect(isValidVentureKey("a")).toBe(false);
    expect(isValidVentureKey("-bad")).toBe(false);
  });

  it("builds default hosts", () => {
    expect(erpHostForKey("rofyt")).toBe("rofyt.vensailabs.in");
    expect(adminHostForKey("rofyt")).toBe("admin-rofyt.vensailabs.in");
    expect(defaultErpUrl("rofyt")).toBe("https://rofyt.vensailabs.in");
    expect(defaultAdminUrl("rofyt")).toBe("https://admin-rofyt.vensailabs.in");
  });
});
