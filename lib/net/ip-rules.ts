import ipaddr from "ipaddr.js";

// Refuse everything that is not a public unicast address: loopback, private,
// link-local, unique-local, CGNAT, unspecified, broadcast/multicast/reserved,
// and IPv4-mapped IPv6 wrapping any of the above. Unparseable input is refused
// (fail closed). Used by the SSRF host guard before dialling any mail server.
export function isDisallowedAddress(ip: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(ip);
  } catch {
    return true; // fail closed on anything we cannot parse
  }
  // Unwrap IPv4-mapped IPv6 (::ffff:a.b.c.d) and classify the embedded IPv4.
  if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
    addr = (addr as ipaddr.IPv6).toIPv4Address();
  }
  // ipaddr's range() returns "unicast" only for globally-routable unicast space;
  // every other classification (loopback/private/linkLocal/uniqueLocal/
  // carrierGradeNat/unspecified/broadcast/multicast/reserved/...) is refused.
  return addr.range() !== "unicast";
}
