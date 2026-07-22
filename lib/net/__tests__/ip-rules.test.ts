import { isDisallowedAddress } from "../ip-rules";

describe("isDisallowedAddress", () => {
  const disallowed = [
    "127.0.0.1", "127.1.2.3", "10.0.0.1", "172.16.0.1", "172.31.255.255",
    "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "255.255.255.255", "224.0.0.1",
    "203.0.113.9", // TEST-NET-3 (RFC 5737 documentation/reserved) — correctly refused
    "::1", "fe80::1", "fc00::1", "fd12:3456::1", "::",
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:192.168.0.1",
    "not-an-ip", "", "999.999.999.999",
  ];
  const allowed = [
    "8.8.8.8", "1.1.1.1", "93.184.216.34",
    "2606:4700:4700::1111", "2001:4860:4860::8888",
    "::ffff:8.8.8.8", // IPv4-mapped public → allowed
  ];

  it.each(disallowed)("refuses %s", (ip) => {
    expect(isDisallowedAddress(ip)).toBe(true);
  });
  it.each(allowed)("allows %s", (ip) => {
    expect(isDisallowedAddress(ip)).toBe(false);
  });
});
