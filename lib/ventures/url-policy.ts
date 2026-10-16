import { lookup } from "dns/promises";
import { isIP } from "net";

import { getVentureDomainSuffix } from "@/lib/ventures/subdomain";

const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80:/i,
];

function isBlockedIp(ip: string): boolean {
  if (ip === "0.0.0.0") return true;
  return BLOCKED_IP_RANGES.some((re) => re.test(ip));
}

/** Validate CRM outbound URL for venture health/provisioning (SSRF guard). */
export async function assertAllowedVentureTargetUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid target URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Target URL must use HTTPS in production.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Target URL must not include credentials.");
  }

  const host = parsed.hostname.toLowerCase();
  const suffix = getVentureDomainSuffix();
  if (!host.endsWith(`.${suffix}`) && host !== suffix) {
    throw new Error(`Target host must be under *.${suffix}.`);
  }

  if (isIP(host)) {
    if (isBlockedIp(host)) throw new Error("Target IP is not allowed.");
    return parsed;
  }

  const records = await lookup(host, { all: true });
  for (const r of records) {
    if (isBlockedIp(r.address)) {
      throw new Error("Target resolves to a blocked address.");
    }
  }

  return parsed;
}
