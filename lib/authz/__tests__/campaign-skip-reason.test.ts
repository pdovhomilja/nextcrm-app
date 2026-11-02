import { campaignSkipReason } from "../scopes/campaign-not-deleted";

describe("campaignSkipReason", () => {
  it("skips a campaign deleted in the UI (status deleted)", () => {
    expect(campaignSkipReason({ status: "deleted", deletedAt: null })).toBe("deleted");
  });

  it("skips a campaign deleted over MCP (deletedAt as Date)", () => {
    expect(campaignSkipReason({ status: "sending", deletedAt: new Date("2026-11-01T10:00:00Z") })).toBe("deleted");
  });

  it("skips a campaign deleted over MCP (deletedAt as string after step.run)", () => {
    expect(campaignSkipReason({ status: "scheduled", deletedAt: "2026-11-01T10:00:00.000Z" })).toBe("deleted");
  });

  it("skips a paused campaign", () => {
    expect(campaignSkipReason({ status: "paused", deletedAt: null })).toBe("paused");
  });

  it("lets a normal campaign send", () => {
    expect(campaignSkipReason({ status: "sending", deletedAt: null })).toBeNull();
  });

  it("lets a campaign with NULL status send", () => {
    expect(campaignSkipReason({ status: null, deletedAt: null })).toBeNull();
  });
});
