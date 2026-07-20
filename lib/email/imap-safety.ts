// Safety helpers for user-supplied IMAP/SMTP connection details.
//
// Motivation (GHSA-f5r5-f2v5-74ww follow-up): the email-account actions let any
// authenticated user open a TCP connection to an arbitrary host:port and, on
// failure, reflected the raw driver error back to the caller. That turned the
// "test connection" / "discover folders" features into a non-blind internal
// port scanner (Postgres 5432, MinIO 9000/9001, Inngest 8288, cloud metadata,
// …) and a service-fingerprinting oracle via leaked protocol/banner text.
//
// This module provides two of the mitigations that need no network work:
//   1. a port allow-list, so only real mail ports are ever dialled; and
//   2. an error classifier, so we return a small fixed set of user-actionable
//      messages instead of the raw driver error.
//
// NOTE: connect-time host validation (reject loopback/private/link-local
// addresses, with DNS-rebinding protection) is the complete fix and is tracked
// separately. With only the port allow-list in place, the residual oracle is
// "does internal host X speak IMAP on 143/993" — far weaker than arbitrary
// port probing, but not fully closed until host validation lands.

export const ALLOWED_IMAP_PORTS: readonly number[] = [143, 993];
export const ALLOWED_SMTP_PORTS: readonly number[] = [25, 465, 587, 2525];

export function isAllowedImapPort(port: number): boolean {
  return Number.isInteger(port) && ALLOWED_IMAP_PORTS.includes(port);
}

export function isAllowedSmtpPort(port: number): boolean {
  return Number.isInteger(port) && ALLOWED_SMTP_PORTS.includes(port);
}

// Collapse a raw IMAP/SMTP driver error into a small, fixed set of
// user-actionable messages. Never returns the original message, so protocol
// text and service banners cannot leak to the caller. The detailed error
// should be logged server-side by the caller for operators.
export function classifyMailError(
  err: { message?: string } | string | null | undefined
): string {
  const raw = typeof err === "string" ? err : err?.message ?? "";
  const m = raw.toLowerCase();

  if (
    m.includes("auth") ||
    m.includes("credential") ||
    m.includes("login") ||
    m.includes("password") ||
    m.includes("invalid user")
  ) {
    return "Authentication failed. Check the username and password.";
  }
  if (m.includes("timed out") || m.includes("timeout") || m.includes("etimedout")) {
    return "Connection timed out. Check the host and port.";
  }
  if (
    m.includes("cert") ||
    m.includes("tls") ||
    m.includes("ssl") ||
    m.includes("self-signed") ||
    m.includes("self signed")
  ) {
    return "TLS error. Check the SSL setting for this port.";
  }
  if (
    m.includes("econnrefused") ||
    m.includes("refused") ||
    m.includes("enotfound") ||
    m.includes("ehostunreach") ||
    m.includes("enetunreach") ||
    m.includes("econnreset") ||
    m.includes("network") ||
    m.includes("getaddrinfo")
  ) {
    return "Could not connect to the mail server.";
  }
  return "Could not complete the connection to the mail server.";
}
