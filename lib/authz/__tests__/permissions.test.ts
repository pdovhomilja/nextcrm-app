import {
  FEATURES,
  PERMISSION_ACTIONS,
  ROLE_DEFAULTS,
  featureForPath,
  resolvePermissions,
} from "../permissions";

const none = { roleOverrides: [], groupEntries: [], userEntries: [] };

describe("resolvePermissions", () => {
  it("uses the role defaults when nothing is stored", () => {
    expect(resolvePermissions({ role: "user", ...none })).toEqual(ROLE_DEFAULTS.user);
  });

  it("keeps products view-only for the user role by default", () => {
    const m = resolvePermissions({ role: "user", ...none });
    expect(m.products).toEqual({ view: true, create: false, edit: false, delete: false });
  });

  it("applies a saved role default over the built-in one", () => {
    const m = resolvePermissions({
      role: "user",
      ...none,
      roleOverrides: [{ feature: "invoices", action: "delete", allowed: false }],
    });
    expect(m.invoices.delete).toBe(false);
    expect(m.invoices.view).toBe(true);
  });

  it("lets a group grant what the role does not", () => {
    const m = resolvePermissions({
      role: "user",
      ...none,
      groupEntries: [{ feature: "products", action: "edit", effect: "ALLOW" }],
    });
    expect(m.products.edit).toBe(true);
  });

  it("lets a group deny beat another group's allow", () => {
    const m = resolvePermissions({
      role: "manager",
      ...none,
      groupEntries: [
        { feature: "reports", action: "view", effect: "ALLOW" },
        { feature: "reports", action: "view", effect: "DENY" },
        { feature: "reports", action: "edit", effect: "DENY" },
        { feature: "reports", action: "edit", effect: "ALLOW" },
      ],
    });
    expect(m.reports.view).toBe(false);
    expect(m.reports.edit).toBe(false);
  });

  it("lets a personal override beat groups and the role", () => {
    const m = resolvePermissions({
      role: "user",
      roleOverrides: [{ feature: "leads", action: "view", allowed: false }],
      groupEntries: [{ feature: "leads", action: "view", effect: "DENY" }],
      userEntries: [{ feature: "leads", action: "view", effect: "ALLOW" }],
    });
    expect(m.leads.view).toBe(true);
  });

  it("lets a personal deny remove access the role grants", () => {
    const m = resolvePermissions({
      role: "manager",
      ...none,
      userEntries: [{ feature: "invoices", action: "view", effect: "DENY" }],
    });
    expect(m.invoices.view).toBe(false);
  });

  it("always gives admins full access", () => {
    const m = resolvePermissions({
      role: "admin",
      roleOverrides: [],
      groupEntries: [{ feature: "invoices", action: "view", effect: "DENY" }],
      userEntries: [{ feature: "invoices", action: "delete", effect: "DENY" }],
    });
    for (const f of FEATURES) {
      for (const a of PERMISSION_ACTIONS) expect(m[f.key][a]).toBe(true);
    }
  });

  it("ignores stored rows for features that no longer exist", () => {
    const m = resolvePermissions({
      role: "user",
      ...none,
      userEntries: [{ feature: "retired", action: "view", effect: "DENY" }],
    });
    expect(m).toEqual(ROLE_DEFAULTS.user);
  });
});

describe("featureForPath", () => {
  it("maps feature pages, with or without a locale prefix", () => {
    expect(featureForPath("/crm/accounts")).toBe("accounts");
    expect(featureForPath("/en/crm/accounts/123")).toBe("accounts");
    expect(featureForPath("/campaigns/templates")).toBe("campaigns");
    expect(featureForPath("/crm/price-lists")).toBe("price_lists");
  });

  it("returns null for pages open to everyone", () => {
    expect(featureForPath("/")).toBeNull();
    expect(featureForPath("/crm")).toBeNull();
    expect(featureForPath("/crm/dashboard")).toBeNull();
    expect(featureForPath("/profile")).toBeNull();
  });
});
