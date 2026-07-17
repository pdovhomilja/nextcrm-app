import { opportunitySchema } from "@/app/[locale]/(routes)/crm/opportunities/table-data/schema";

const baseRow = {
  id: "o1",
  name: "Deal",
  description: null,
  next_step: null,
  status: "ACTIVE",
  budget: 1000,
  expected_revenue: 2500,
  currency: "CZK",
  assigned_account: { name: "Acme" },
  assigned_sales_stage: { name: "Pre-Sale" },
  assigned_to_user: { name: "Rep" },
};

describe("opportunitySchema", () => {
  it("accepts a row with a close_date", () => {
    const parsed = opportunitySchema.parse({
      ...baseRow,
      close_date: new Date("2026-09-30"),
    });
    expect(parsed.close_date).toBeInstanceOf(Date);
  });

  it("accepts a row with close_date null (e.g. created via target conversion)", () => {
    const parsed = opportunitySchema.parse({ ...baseRow, close_date: null });
    expect(parsed.close_date).toBeNull();
  });
});
