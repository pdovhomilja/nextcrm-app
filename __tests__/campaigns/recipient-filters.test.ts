import {
  subscribedTargetsInclude,
  eligibleFollowUpSendsWhere,
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
});
