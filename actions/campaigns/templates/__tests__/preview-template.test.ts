jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { previewTemplate } from "@/actions/campaigns/templates/preview-template";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("previewTemplate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await previewTemplate({ contentHtml: "<p>Hi</p>" });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("returns the content wrapped in the full campaign email document", async () => {
    mockUser("user");
    const contentHtml = "<p>Hello <strong>there</strong></p>";
    const res = await previewTemplate({ contentHtml });
    expect(res.html).toContain("<html");
    expect(res.html).toContain(contentHtml);
    expect(res.html!.toLowerCase()).toContain("unsubscribe");
  });
});
