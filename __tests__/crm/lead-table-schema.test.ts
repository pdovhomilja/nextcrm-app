import { leadSchema } from "@/app/[locale]/(routes)/crm/leads/table-data/schema";

describe("leadSchema", () => {
  it("accepts a short lastName (real surnames can be 2 characters)", () => {
    const parsed = leadSchema.parse({
      id: "l1",
      createdAt: new Date(),
      updatedAt: new Date(),
      firstName: "An",
      lastName: "Ng",
    });
    expect(parsed.lastName).toBe("Ng");
  });

  it("accepts null createdAt/updatedAt (nullable in the DB)", () => {
    const parsed = leadSchema.parse({
      id: "l2",
      createdAt: null,
      updatedAt: null,
      firstName: null,
      lastName: "Doe",
    });
    expect(parsed.createdAt).toBeNull();
    expect(parsed.updatedAt).toBeNull();
  });

  it("accepts a lastName longer than 30 characters", () => {
    const long = "A".repeat(40);
    const parsed = leadSchema.parse({
      id: "l3",
      createdAt: new Date(),
      updatedAt: null,
      lastName: long,
    });
    expect(parsed.lastName).toBe(long);
  });
});
