import {
  targetEngagementStatus,
  engagementStatusLabel,
  engagementBadgeVariant,
  engagementRank,
} from "../engagement-options";

describe("targetEngagementStatus", () => {
  it("returns NONE for no emails", () => {
    expect(targetEngagementStatus(undefined)).toBe("NONE");
    expect(targetEngagementStatus(null)).toBe("NONE");
    expect(targetEngagementStatus([])).toBe("NONE");
  });

  it("CLICKED when any email's homepage link was clicked (outranks all)", () => {
    expect(
      targetEngagementStatus([
        { status: "SENT", opened_at: new Date() },
        { status: "SENT", opened_at: new Date(), homepage_clicked_at: new Date() },
      ]),
    ).toBe("CLICKED");
  });

  it("OPENED when opened but no homepage click", () => {
    expect(
      targetEngagementStatus([
        { status: "SENT", opened_at: new Date(), homepage_clicked_at: null },
        { status: "SENT" },
      ]),
    ).toBe("OPENED");
  });

  it("SENT when sent but never opened", () => {
    expect(targetEngagementStatus([{ status: "SENT" }])).toBe("SENT");
  });

  it("NONE when only FAILED/DRAFT (not a successful send)", () => {
    expect(
      targetEngagementStatus([{ status: "FAILED" }, { status: "DRAFT" }]),
    ).toBe("NONE");
  });

  it("is order-independent (furthest state wins)", () => {
    const emails = [
      { status: "SENT" },
      { status: "SENT", opened_at: new Date() },
      { status: "SENT", homepage_clicked_at: new Date() },
    ];
    expect(targetEngagementStatus(emails)).toBe("CLICKED");
    expect(targetEngagementStatus([...emails].reverse())).toBe("CLICKED");
  });

  it("treats an open as at least OPENED even if status isn't SENT (can't open an unsent mail)", () => {
    expect(targetEngagementStatus([{ opened_at: new Date() }])).toBe("OPENED");
  });
});

describe("label + badge helpers", () => {
  it("labels each status", () => {
    expect(engagementStatusLabel("CLICKED")).toBe("Clicked");
    expect(engagementStatusLabel("OPENED")).toBe("Opened");
    expect(engagementStatusLabel("SENT")).toBe("Sent");
    expect(engagementStatusLabel("NONE")).toBe("Not sent");
    expect(engagementStatusLabel(undefined)).toBe("Not sent");
  });

  it("maps a variant per status", () => {
    expect(engagementBadgeVariant("CLICKED")).toBe("default");
    expect(engagementBadgeVariant("OPENED")).toBe("secondary");
    expect(engagementBadgeVariant("SENT")).toBe("outline");
    expect(engagementBadgeVariant("NONE")).toBe("outline");
  });

  it("ranks by engagement strength for sorting (Clicked>Opened>Sent>Not sent)", () => {
    expect(engagementRank("CLICKED")).toBeGreaterThan(engagementRank("OPENED"));
    expect(engagementRank("OPENED")).toBeGreaterThan(engagementRank("SENT"));
    expect(engagementRank("SENT")).toBeGreaterThan(engagementRank("NONE"));
    expect(engagementRank("NONE")).toBe(0);
    expect(engagementRank(undefined)).toBe(0);
    // Sorting a shuffled set ascending yields NONE..CLICKED (not alphabetical).
    const sorted = ["SENT", "NONE", "CLICKED", "OPENED"].sort(
      (a, b) => engagementRank(a) - engagementRank(b),
    );
    expect(sorted).toEqual(["NONE", "SENT", "OPENED", "CLICKED"]);
  });
});
