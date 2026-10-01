jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Target_Homepage: { findFirst: jest.fn() } },
}));
jest.mock("@/lib/homepage/storage", () => ({
  getHomepageImage: jest.fn(),
}));
import { prismadb } from "@/lib/prisma";
import { getHomepageImage } from "@/lib/homepage/storage";
import { GET } from "@/app/p/[slug]/images/[name]/route";

const find = prismadb.crm_Target_Homepage.findFirst as jest.Mock;
const img = getHomepageImage as jest.Mock;

const params = (slug: string, name: string) => ({ params: Promise.resolve({ slug, name }) });
const req = (slug: string, name: string) => new Request(`https://previews.example/p/${slug}/images/${name}`);

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

beforeEach(() => jest.resetAllMocks());

describe("GET /p/[slug]/images/[name]", () => {
  it("serves a stored JPEG with image/jpeg (not hardcoded png)", async () => {
    find.mockResolvedValue({ id: "h1" });
    img.mockResolvedValue({ buffer: JPEG, contentType: "image/jpeg" });
    const res = await GET(req("acme", "img-1.jpg"), params("acme", "img-1.jpg"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    );
    expect(img).toHaveBeenCalledWith("acme", "img-1.jpg");
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "acme", deletedAt: null, current_version_id: { not: null } } })
    );
    expect(Buffer.from(await res.arrayBuffer())).toEqual(JPEG);
  });

  it("serves a stored PNG with image/png", async () => {
    find.mockResolvedValue({ id: "h1" });
    img.mockResolvedValue({ buffer: PNG, contentType: "image/png" });
    const res = await GET(req("acme", "img-1.png"), params("acme", "img-1.png"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("404s an unpublished/unknown slug and a missing object", async () => {
    find.mockResolvedValue(null);
    const nf = await GET(req("nope", "a.png"), params("nope", "a.png"));
    expect(nf.status).toBe(404);
    expect(nf.headers.get("cache-control")).toBe("no-store");
    expect(img).not.toHaveBeenCalled();
    find.mockResolvedValue({ id: "h1" });
    img.mockResolvedValue(null);
    expect((await GET(req("acme", "a.png"), params("acme", "a.png"))).status).toBe(404);
  });

  it("404s a bad name without touching DB or storage", async () => {
    for (const n of ["../x.png", "a/b.png", "a%00.png", "a b.png", ""]) {
      expect((await GET(req("acme", "x"), params("acme", n))).status).toBe(404);
    }
    expect(find).not.toHaveBeenCalled();
    expect(img).not.toHaveBeenCalled();
  });
});
