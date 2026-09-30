jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Target_Homepage: { findFirst: jest.fn() } },
}));
jest.mock("@/lib/homepage/storage", () => ({
  getHomepageHtml: jest.fn(),
  getHomepageScreenshotBuffer: jest.fn(),
}));
import { prismadb } from "@/lib/prisma";
import { getHomepageHtml, getHomepageScreenshotBuffer } from "@/lib/homepage/storage";
import { GET as getPage } from "@/app/p/[slug]/route";
import { GET as getShot } from "@/app/p/[slug]/screenshot.png/route";

const find = prismadb.crm_Target_Homepage.findFirst as jest.Mock;
const html = getHomepageHtml as jest.Mock;
const shot = getHomepageScreenshotBuffer as jest.Mock;

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const req = (slug: string) => new Request(`https://previews.example/p/${slug}`);

beforeEach(() => jest.resetAllMocks());

describe("GET /p/[slug]", () => {
  it("serves stored html for a READY slug", async () => {
    find.mockResolvedValue({ id: "h1" });
    html.mockResolvedValue("<html>hi</html>");
    const res = await getPage(req("acme"), params("acme"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    expect(res.headers.get("content-security-policy")).toBe("sandbox allow-scripts");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.text()).toBe("<html>hi</html>");
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "acme", deletedAt: null, status: "READY" } })
    );
  });

  it("404s an unknown/not-ready slug with the same body as a missing object", async () => {
    find.mockResolvedValue(null);
    const a = await getPage(req("nope"), params("nope"));
    expect(a.status).toBe(404);
    expect(a.headers.get("cache-control")).toBe("no-store");
    expect(a.headers.get("x-robots-tag")).toBe("noindex");
    expect(a.headers.get("x-content-type-options")).toBe("nosniff");
    expect(html).not.toHaveBeenCalled();

    find.mockResolvedValue({ id: "h1" });
    html.mockResolvedValue(null);
    const b = await getPage(req("acme"), params("acme"));
    expect(b.status).toBe(404);
    expect(await b.text()).toBe(await a.text());
  });

  it("404s (no throw, no DB/R2 access) for a weird-char slug", async () => {
    for (const s of ["../etc/passwd", "a/b", "A%00", "x".repeat(200), ""]) {
      const res = await getPage(req("x"), params(s));
      expect(res.status).toBe(404);
    }
    expect(find).not.toHaveBeenCalled();
    expect(html).not.toHaveBeenCalled();
  });

  it("serves a max-length slugify() output (guard agrees with slugify)", async () => {
    const { slugify, SLUG_MAX_LENGTH } = jest.requireActual("@/lib/homepage/slug");
    const long = slugify("ab-".repeat(200));
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(long.endsWith("-")).toBe(false);
    find.mockResolvedValue({ id: "h1" });
    html.mockResolvedValue("<html/>");
    expect((await getPage(req("x"), params(long))).status).toBe(200);
    expect((await getPage(req("x"), params(`${long}-99`))).status).toBe(200);
  });

  it("404s (not 500) when storage throws", async () => {
    find.mockResolvedValue({ id: "h1" });
    html.mockRejectedValue(new Error("r2 down"));
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await getPage(req("acme"), params("acme"));
    expect(res.status).toBe(404);
    spy.mockRestore();
  });
});

describe("GET /p/[slug]/screenshot.png", () => {
  it("serves the png for a READY slug", async () => {
    find.mockResolvedValue({ id: "h1" });
    shot.mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const res = await getShot(req("acme"), params("acme"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBeNull();
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "acme", deletedAt: null, status: "READY" } })
    );
    expect(Buffer.from(await res.arrayBuffer())).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it("404s unknown slug, missing object, and weird slug", async () => {
    find.mockResolvedValue(null);
    const nf = await getShot(req("nope"), params("nope"));
    expect(nf.status).toBe(404);
    expect(nf.headers.get("cache-control")).toBe("no-store");
    expect(nf.headers.get("x-robots-tag")).toBe("noindex");
    expect(nf.headers.get("x-content-type-options")).toBe("nosniff");
    find.mockResolvedValue({ id: "h1" });
    shot.mockResolvedValue(null);
    expect((await getShot(req("acme"), params("acme"))).status).toBe(404);
    find.mockClear();
    expect((await getShot(req("x"), params("../x"))).status).toBe(404);
    expect(find).not.toHaveBeenCalled();
  });
});
