import { buildBulkWorkEmails } from "@/lib/admin/bulk-user-addresses";

describe("buildBulkWorkEmails", () => {
  it("joins prefix, middle, and suffix for one user", () => {
    expect(
      buildBulkWorkEmails({
        prefix: "trn",
        middix: "1",
        suffix: "plx",
        count: 1,
        domain: "vensailabs.in",
      })
    ).toEqual({ emails: ["trn1plx@vensailabs.in"] });
  });

  it("counts the middle number up and keeps the suffix", () => {
    const result = buildBulkWorkEmails({
      prefix: "trn",
      middix: "1",
      suffix: "plx",
      count: 11,
      domain: "vensailabs.in",
    });
    expect(result).toEqual({
      emails: Array.from({ length: 11 }, (_, i) => `trn${i + 1}plx@vensailabs.in`),
    });
  });

  it("goes from 10 to 11 instead of gluing on another digit", () => {
    expect(
      buildBulkWorkEmails({
        prefix: "trn",
        middix: "10",
        suffix: "plx",
        count: 2,
        domain: "vensailabs.in",
      })
    ).toEqual({
      emails: ["trn10plx@vensailabs.in", "trn11plx@vensailabs.in"],
    });
  });

  it("accepts only a prefix", () => {
    expect(
      buildBulkWorkEmails({
        prefix: "trn",
        middix: "",
        suffix: "",
        count: 2,
        domain: "vensailabs.in",
      })
    ).toEqual({ emails: ["trn1@vensailabs.in", "trn2@vensailabs.in"] });
  });
});
