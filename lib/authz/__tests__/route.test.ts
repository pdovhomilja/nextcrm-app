import { unauthorizedResponse, forbiddenResponse, notFoundOrForbiddenResponse } from "../route";

describe("response helpers", () => {
  it("unauthorizedResponse returns 401 with consistent body", async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("forbiddenResponse returns 403", async () => {
    const res = forbiddenResponse();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("notFoundOrForbiddenResponse returns 404 to avoid IDOR existence leaks", async () => {
    const res = notFoundOrForbiddenResponse();
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
  });
});
