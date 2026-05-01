import { APP_ROLES, parseRole, mapLegacyRole } from "../roles";

describe("APP_ROLES", () => {
  it("contains exactly user, manager, admin", () => {
    expect([...APP_ROLES].sort()).toEqual(["admin", "manager", "user"]);
  });
});

describe("parseRole", () => {
  it("returns the role for canonical values", () => {
    expect(parseRole("user")).toBe("user");
    expect(parseRole("manager")).toBe("manager");
    expect(parseRole("admin")).toBe("admin");
  });

  it("returns null for unknown values", () => {
    expect(parseRole("member")).toBeNull();
    expect(parseRole("viewer")).toBeNull();
    expect(parseRole("")).toBeNull();
    expect(parseRole(null)).toBeNull();
    expect(parseRole(undefined)).toBeNull();
  });
});

describe("mapLegacyRole", () => {
  it("maps admin -> admin, member -> manager, viewer -> user", () => {
    expect(mapLegacyRole("admin")).toBe("admin");
    expect(mapLegacyRole("member")).toBe("manager");
    expect(mapLegacyRole("viewer")).toBe("user");
  });

  it("returns user for unknown legacy values", () => {
    expect(mapLegacyRole("foo")).toBe("user");
    expect(mapLegacyRole(null)).toBe("user");
    expect(mapLegacyRole(undefined)).toBe("user");
  });

  it("passes canonical values through unchanged", () => {
    expect(mapLegacyRole("user")).toBe("user");
    expect(mapLegacyRole("manager")).toBe("manager");
  });
});
