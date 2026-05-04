jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getApiKey } from "@/lib/api-keys";
import { generateTemplate } from "@/actions/campaigns/templates/generate-template";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const mockFetchOk = () => {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ subject: "S", html: "<p>H</p>" }) } }],
    }),
  });
};

describe("generateTemplate scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getApiKey as jest.Mock).mockResolvedValue("sk-test");
  });

  it("unauthenticated throws Unauthorized and never calls fetch", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    (global as any).fetch = jest.fn();
    await expect(generateTemplate("p")).rejects.toThrow();
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it("user generates template; getApiKey called with user.id", async () => {
    mockUser("user", "u1");
    mockFetchOk();
    const res = await generateTemplate("write a welcome");
    expect(res.subject).toBe("S");
    expect(res.html).toBe("<p>H</p>");
    expect(getApiKey).toHaveBeenCalledWith("OPENAI", "u1");
  });

  it("manager generates template", async () => {
    mockUser("manager", "m1");
    mockFetchOk();
    const res = await generateTemplate("p");
    expect(res.subject).toBe("S");
    expect(getApiKey).toHaveBeenCalledWith("OPENAI", "m1");
  });

  it("admin generates template", async () => {
    mockUser("admin", "a1");
    mockFetchOk();
    const res = await generateTemplate("p");
    expect(res.subject).toBe("S");
    expect(getApiKey).toHaveBeenCalledWith("OPENAI", "a1");
  });
});
