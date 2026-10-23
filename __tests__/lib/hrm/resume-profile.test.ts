import { parseResumeJson, profileFromPlainText } from "@/lib/hrm/resume-profile";

describe("resume profile", () => {
  it("parses fenced JSON from the model", () => {
    const profile = parseResumeJson('```json\n{"fullName":"Ada Lovelace","email":"Ada@Example.com","skills":["Math"]}\n```');
    expect(profile?.fullName).toBe("Ada Lovelace");
    expect(profile?.email).toBe("ada@example.com");
    expect(profile?.skills).toEqual(["Math"]);
  });

  it("pulls contact lines from plain resume text", () => {
    const profile = profileFromPlainText("Ada Lovelace\nLondon\nada@example.com\n+44 20 7946 0958");
    expect(profile.fullName).toBe("Ada Lovelace");
    expect(profile.email).toBe("ada@example.com");
    expect(profile.phone).toContain("44");
  });
});
