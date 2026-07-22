import { lookup } from "node:dns/promises";
import net from "node:net";
import { isDisallowedAddress } from "./ip-rules";

export class HostNotAllowedError extends Error {
  constructor(message = "Host is not allowed") {
    super(message);
    this.name = "HostNotAllowedError";
  }
}

// Resolve `host` once and return a validated, pinned address to dial. If any
// resolved address is non-public (or the host is unresolvable), throw. Callers
// MUST dial the returned `address` (the pinned IP), keeping `hostname` for TLS
// SNI — dialling the hostname would re-resolve and reopen the DNS-rebinding hole.
export async function assertPublicHost(
  host: string,
): Promise<{ address: string; hostname: string }> {
  if (process.env.MAIL_ALLOW_PRIVATE_HOSTS === "true") {
    return { address: host, hostname: host };
  }

  if (net.isIP(host) !== 0) {
    if (isDisallowedAddress(host)) throw new HostNotAllowedError();
    return { address: host, hostname: host };
  }

  let results: { address: string; family: number }[];
  try {
    results = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new HostNotAllowedError();
  }
  if (!results || results.length === 0) throw new HostNotAllowedError();
  for (const r of results) {
    if (isDisallowedAddress(r.address)) throw new HostNotAllowedError();
  }
  return { address: results[0].address, hostname: host };
}
