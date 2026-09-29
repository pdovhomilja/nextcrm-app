import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSiteUrl, filterNewByWebsite } from "./dedupe.mjs";

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
