import { parseOnWroteLabel } from "@/lib/email/parse-on-wrote-label";

describe("parseOnWroteLabel", () => {
  it("extracts name, email, and date from Gmail header", () => {
    const parsed = parseOnWroteLabel(
      "Sun, Oct 11, 2026 at 9:23 PM True Heart : The real you <jayandraa5@gmail.com>"
    );
    expect(parsed.fromEmail).toBe("jayandraa5@gmail.com");
    expect(parsed.fromName).toContain("True Heart");
    expect(parsed.dateLabel).toMatch(/Oct 11, 2026/);
  });
});
