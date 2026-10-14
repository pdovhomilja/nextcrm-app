import { mailboxShortLabel } from "@/lib/email/mailbox-display-name";

describe("mailboxShortLabel", () => {
  it("uses the first name token", () => {
    expect(mailboxShortLabel("Jayandra Babu Pilla")).toBe("Jayandra");
  });

  it("truncates long single tokens", () => {
    expect(mailboxShortLabel("Verylongfirstname")).toBe("Verylongfi…");
  });
});
