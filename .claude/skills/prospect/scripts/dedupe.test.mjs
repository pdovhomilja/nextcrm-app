import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSiteUrl,
  filterNewByWebsite,
  normalizeCompanyName,
  filterNewProspects,
} from "./dedupe.mjs";

test("normalizeSiteUrl collapses scheme, www, path, case, trailing slash", () => {
  const forms = [
    "https://www.Foo.com/",
    "http://foo.com",
    "https://foo.com/services/",
    "FOO.com",
    "https://www.foo.com/a/b?c=d",
  ];
  for (const f of forms) assert.equal(normalizeSiteUrl(f), "foo.com");
});

test("normalizeSiteUrl keeps distinct hosts distinct", () => {
  assert.notEqual(normalizeSiteUrl("https://foo.com"), normalizeSiteUrl("https://bar.com"));
  assert.equal(normalizeSiteUrl("https://sub.foo.com"), "sub.foo.com");
});

test("filterNewByWebsite skips existing (any URL form) and keeps net-new", () => {
  const candidates = [
    { company_website: "https://www.existing.com/home" },
    { company_website: "http://fresh.com" },
  ];
  const existing = ["https://existing.com/"];
  const { kept, skipped } = filterNewByWebsite(candidates, existing);
  assert.deepEqual(kept.map((c) => c.company_website), ["http://fresh.com"]);
  assert.equal(skipped.length, 1);
});

test("filterNewByWebsite dedups within the candidate batch too", () => {
  const candidates = [
    { company_website: "https://dup.com/" },
    { company_website: "http://www.dup.com/x" },
  ];
  const { kept } = filterNewByWebsite(candidates, []);
  assert.equal(kept.length, 1);
});

test("normalizeCompanyName lowercases, strips legal suffix/punctuation/whitespace", () => {
  assert.equal(normalizeCompanyName("Mike Bryant Heating & Cooling, LLC"), "mike bryant heating cooling");
  assert.equal(normalizeCompanyName("  Acme  Plumbing   Inc. "), "acme plumbing");
  assert.equal(normalizeCompanyName("Acme Plumbing"), "acme plumbing");
});

test("filterNewProspects skips an existing match by company name even when website is blank", () => {
  // The regression: pre-parity CRM rows have blank company_website, so website-only
  // dedup can never catch them. Name dedup must.
  const existing = [{ company_website: "", company: "Acme Plumbing LLC" }];
  const candidates = [{ company_website: "https://acme.com/", company: "Acme Plumbing" }];
  const { kept, skipped } = filterNewProspects(candidates, existing);
  assert.equal(kept.length, 0);
  assert.equal(skipped.length, 1);
});

test("filterNewProspects skips by website OR name and keeps genuinely-new", () => {
  const existing = [
    { company_website: "https://existing.com/", company: "Existing Co" },
    { company_website: "", company: "Blank Site LLC" },
  ];
  const candidates = [
    { company_website: "http://www.existing.com/x", company: "Whatever" }, // website match
    { company_website: "https://blanksite.com/", company: "Blank Site" }, // name match
    { company_website: "https://fresh.com/", company: "Fresh Co" }, // net-new
  ];
  const { kept, skipped } = filterNewProspects(candidates, existing);
  assert.deepEqual(kept.map((c) => c.company), ["Fresh Co"]);
  assert.equal(skipped.length, 2);
});
