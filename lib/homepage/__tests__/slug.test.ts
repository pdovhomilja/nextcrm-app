jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Target_Homepage: {
      findUnique: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import { slugify, ensureUniqueSlug } from "@/lib/homepage/slug";

describe("slug utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("slugify", () => {
    it("slugifies company names", () => {
      expect(slugify("Summit Plumbing Co.")).toBe("summit-plumbing-co");
      expect(slugify("  A/B  &  C ")).toBe("a-b-c");
    });

    it("handles edge cases", () => {
      expect(slugify("")).toBe("");
      expect(slugify("   ")).toBe("");
      expect(slugify("123-456")).toBe("123-456");
      expect(slugify("UPPERCASE")).toBe("uppercase");
    });
  });

  describe("ensureUniqueSlug", () => {
    it("returns slug when not taken", async () => {
      (prismadb.crm_Target_Homepage.findUnique as jest.Mock).mockResolvedValueOnce(
        null
      );
      expect(await ensureUniqueSlug("Acme")).toBe("acme");
    });

    it("suffixes on collision", async () => {
      (prismadb.crm_Target_Homepage.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "1" }) // "acme" taken
        .mockResolvedValueOnce(null); // "acme-2" free
      expect(await ensureUniqueSlug("Acme")).toBe("acme-2");
    });

    it("handles multiple collisions", async () => {
      (prismadb.crm_Target_Homepage.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "1" }) // "acme" taken
        .mockResolvedValueOnce({ id: "2" }) // "acme-2" taken
        .mockResolvedValueOnce({ id: "3" }) // "acme-3" taken
        .mockResolvedValueOnce(null); // "acme-4" free
      expect(await ensureUniqueSlug("Acme")).toBe("acme-4");
    });
  });
});
