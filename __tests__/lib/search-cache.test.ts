import { getSearchCache, setSearchCache } from "@/lib/cache/search-cache";

jest.mock("@/lib/cache/upstash-redis", () => ({
  getUpstashRedis: jest.fn().mockReturnValue(null),
}));

describe("search-cache", () => {
  it("returns null when Redis is not configured", async () => {
    await expect(getSearchCache("u1", "unified", { q: "acme" })).resolves.toBeNull();
    await expect(setSearchCache("u1", "unified", { q: "acme" }, {}, 60)).resolves.toBeUndefined();
  });
});
