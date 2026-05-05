import { getReportScope } from "../scopes/report-scope";

describe("getReportScope", () => {
  it("admin: all fragments empty (no filter)", () => {
    const s = getReportScope({ id: "a", role: "admin" });
    expect(s.opportunity).toEqual({});
    expect(s.lead).toEqual({});
    expect(s.account).toEqual({});
    expect(s.contact).toEqual({});
    expect(s.task).toEqual({});
    expect(s.campaign).toEqual({});
    expect(s.allowUserDirectory).toBe(true);
  });

  it("manager: same as admin for non-admin entities", () => {
    const s = getReportScope({ id: "m", role: "manager" });
    expect(s.opportunity).toEqual({});
    expect(s.lead).toEqual({});
    expect(s.allowUserDirectory).toBe(true);
  });

  it("user: each entity filters to user-owned rows", () => {
    const s = getReportScope({ id: "u1", role: "user" });
    expect(s.opportunity).toMatchObject({
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
      ]),
    });
    expect(s.lead).toMatchObject({
      OR: expect.arrayContaining([{ assigned_to: "u1" }, { createdBy: "u1" }]),
    });
    expect(s.account).toMatchObject({
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { watchers: { some: { user_id: "u1" } } },
      ]),
    });
    expect(s.contact).toMatchObject({
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
      ]),
    });
    expect(s.task).toMatchObject({ user: "u1" });
    expect(s.campaign).toMatchObject({ created_by: "u1" });
    expect(s.allowUserDirectory).toBe(false);
  });
});
