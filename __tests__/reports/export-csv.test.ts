import { generateCSV } from "@/actions/reports/export-csv";

describe("generateCSV", () => {
  it("converts chart data points to CSV string", () => {
    const data = [
      { name: "January", Number: 10 },
      { name: "February", Number: 20 },
    ];
    const csv = generateCSV(data, ["Name", "Count"]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Count");
    expect(lines[1]).toBe("January,10");
    expect(lines[2]).toBe("February,20");
  });

  it("escapes commas in values", () => {
    const data = [{ name: "Acme, Inc.", Number: 100 }];
    const csv = generateCSV(data, ["Name", "Count"]);
    expect(csv).toContain('"Acme, Inc."');
  });

  it("handles empty data", () => {
    const csv = generateCSV([], ["Name", "Count"]);
    expect(csv).toBe("Name,Count");
  });
});
