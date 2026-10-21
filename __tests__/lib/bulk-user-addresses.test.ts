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

  it("keeps prefix and middle and numbers the suffix for many users", () => {
    const result = buildBulkWorkEmails({
      prefix: "trn",
      middix: "1",
      suffix: "plx",
      count: 10,
      domain: "vensailabs.in",
    });
    expect(result).toEqual({
      emails: Array.from({ length: 10 }, (_, i) => `trn1${i + 1}@vensailabs.in`),
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
