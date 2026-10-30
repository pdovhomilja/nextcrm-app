/**
 * Presigned uploads: the URL must pin the Content-Type the server allowed
 * (MinIO then rejects a PUT with any other type), and the object key's
 * extension comes from that content type, never from the user's filename.
 * Public avatars/ takes images only.
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "u1", role: "user" } }),
}));

import { POST } from "../route";

function post(body: object) {
  return POST(
    new NextRequest("http://localhost:3000/api/upload/presigned-url", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/upload/presigned-url", () => {
  it("signs the content-type header and takes the extension from the content type", async () => {
    const res = await post({ filename: "sentinel.html", contentType: "image/png", folder: "avatars" });
    expect(res.status).toBe(200);
    const { presignedUrl, key } = await res.json();

    expect(key).toMatch(/^avatars\/[0-9a-f-]{36}\.png$/);
    const signed = new URL(presignedUrl).searchParams.get("X-Amz-SignedHeaders")!.split(";");
    expect(signed).toContain("content-type");
  });

  it.each([
    ["application/pdf", "pdf"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
    ["text/plain", "txt"],
    ["image/jpeg", "jpg"],
  ])("stores %s under documents/ with .%s whatever the filename says", async (contentType, ext) => {
    const res = await post({ filename: "x.html", contentType, folder: "documents" });
    expect(res.status).toBe(200);
    const { key } = await res.json();
    expect(key.endsWith(`.${ext}`)).toBe(true);
  });

  it.each(["application/pdf", "text/plain", "application/msword"])(
    "refuses %s for avatars/",
    async (contentType) => {
      const res = await post({ filename: "a.pdf", contentType, folder: "avatars" });
      expect(res.status).toBe(400);
    }
  );

  it("still refuses a content type outside the allowlist", async () => {
    const res = await post({ filename: "a.html", contentType: "text/html", folder: "documents" });
    expect(res.status).toBe(400);
  });
});
