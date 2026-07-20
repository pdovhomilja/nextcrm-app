import {
  isAllowedImapPort,
  isAllowedSmtpPort,
  classifyMailError,
  ALLOWED_IMAP_PORTS,
  ALLOWED_SMTP_PORTS,
} from "@/lib/email/imap-safety";

describe("isAllowedImapPort", () => {
  it("accepts standard IMAP ports", () => {
    expect(isAllowedImapPort(143)).toBe(true);
    expect(isAllowedImapPort(993)).toBe(true);
  });

  it("rejects internal-service ports used for SSRF scanning", () => {
    for (const p of [5432, 9000, 9001, 8288, 6379, 80, 443, 22, 25]) {
      expect(isAllowedImapPort(p)).toBe(false);
    }
  });

  it("rejects non-integers and out-of-range values", () => {
    expect(isAllowedImapPort(993.5)).toBe(false);
    expect(isAllowedImapPort(NaN)).toBe(false);
    expect(isAllowedImapPort(0)).toBe(false);
    expect(isAllowedImapPort(70000)).toBe(false);
  });
});

describe("isAllowedSmtpPort", () => {
  it("accepts standard SMTP submission ports", () => {
    for (const p of ALLOWED_SMTP_PORTS) expect(isAllowedSmtpPort(p)).toBe(true);
  });

  it("rejects internal-service ports", () => {
    for (const p of [5432, 9000, 8288, 993]) {
      expect(isAllowedSmtpPort(p)).toBe(false);
    }
  });
});

describe("classifyMailError", () => {
  it("never returns the original error text (no banner/protocol leak)", () => {
    const secret = "220 nextcrm-postgres PostgreSQL 16.2 ready on 10.0.0.5";
    const out = classifyMailError(secret);
    expect(out).not.toContain("PostgreSQL");
    expect(out).not.toContain("10.0.0.5");
    expect(out).not.toContain("220");
  });

  it("maps auth failures to a generic auth message", () => {
    expect(classifyMailError("Invalid credentials (LOGIN failed)")).toMatch(
      /authentication failed/i
    );
    expect(classifyMailError({ message: "bad password" })).toMatch(
      /authentication failed/i
    );
  });

  it("maps connection failures to a generic connect message", () => {
    expect(classifyMailError("connect ECONNREFUSED 127.0.0.1:5432")).toMatch(
      /could not connect/i
    );
    expect(classifyMailError("getaddrinfo ENOTFOUND nope.invalid")).toMatch(
      /could not connect/i
    );
  });

  it("maps timeouts and TLS errors distinctly", () => {
    expect(classifyMailError("ETIMEDOUT")).toMatch(/timed out/i);
    expect(classifyMailError("self-signed certificate")).toMatch(/tls error/i);
  });

  it("has a safe fallback for unknown errors", () => {
    expect(classifyMailError(null)).toMatch(/could not complete/i);
    expect(classifyMailError(undefined)).toMatch(/could not complete/i);
    expect(classifyMailError("")).toMatch(/could not complete/i);
  });
});
