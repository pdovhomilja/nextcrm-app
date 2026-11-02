import {
  subscribedTargetsInclude,
  eligibleFollowUpSendsWhere,
  sendStepSkipReason,
  campaignSkipReason,
} from "@/lib/campaigns/recipient-filters";

describe("recipient-filters", () => {
  it("subscribedTargetsInclude excludes opted-out targets", () => {
    expect(subscribedTargetsInclude()).toEqual({
      targets: {
        where: { target: { do_not_email: false } },
        include: { target: { select: { id: true, email: true } } },
      },
    });
  });

  it("eligibleFollowUpSendsWhere for send_to=all", () => {
    expect(eligibleFollowUpSendsWhere("step-0", "all")).toEqual({
      step_id: "step-0",
      status: { in: ["sent", "delivered"] },
      unsubscribed_at: null,
      target: { do_not_email: false },
    });
  });

  it("eligibleFollowUpSendsWhere for send_to=non_openers adds opened_at filter", () => {
    expect(eligibleFollowUpSendsWhere("step-0", "non_openers")).toEqual({
      step_id: "step-0",
      status: { in: ["sent", "delivered"] },
      unsubscribed_at: null,
      target: { do_not_email: false },
      opened_at: null,
    });
  });

  describe("sendStepSkipReason", () => {
    it("skips when the record is already sent", () => {
      expect(
        sendStepSkipReason({
          status: "sent",
          unsubscribed_at: null,
          target: { do_not_email: false },
        })
      ).toBe("already sent");
    });

    it("skips when the recipient unsubscribed", () => {
      expect(
        sendStepSkipReason({
          status: "queued",
          unsubscribed_at: new Date("2026-01-01"),
          target: { do_not_email: false },
        })
      ).toBe("recipient unsubscribed");
    });

    it("skips when the target is globally suppressed", () => {
      expect(
        sendStepSkipReason({
          status: "queued",
          unsubscribed_at: null,
          target: { do_not_email: true },
        })
      ).toBe("recipient globally suppressed");
    });

    it("returns null when the send may proceed", () => {
      expect(
        sendStepSkipReason({
          status: "queued",
          unsubscribed_at: null,
          target: { do_not_email: false },
        })
      ).toBeNull();
    });
  });
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
});
