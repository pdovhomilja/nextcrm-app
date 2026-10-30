/**
 * MCP upload URLs pin the document's Content-Type in the signature, and a new
 * document's storage key takes its extension from the content type, never
 * from the document name. Same rule as /api/upload/presigned-url.
 */
const mockCreate = jest.fn();
const mockFindFirst = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prismadb: { documents: { create: mockCreate, findFirst: mockFindFirst } },
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import { crmDocumentTools } from "@/lib/mcp/tools/crm-documents";
import type { AuthzUser } from "@/lib/authz";

const user = { id: "u1", role: "user" } as unknown as AuthzUser;
const tool = (name: string) => crmDocumentTools.find((t) => t.name === name)!;
const call = (name: string, args: unknown) => (tool(name).handler as any)(args, user.id, user);
const signedHeaders = (url: string) =>
  new URL(url).searchParams.get("X-Amz-SignedHeaders")!.split(";");

beforeEach(() => {
  mockCreate.mockReset().mockImplementation(({ data }) => Promise.resolve({ id: "d1", ...data }));
  mockFindFirst.mockReset();
});

describe("crm_create_document", () => {
  it("keys the file by content type and signs the content-type header", async () => {
    const res = await call("crm_create_document", { document_name: "page.html", contentType: "application/pdf" });
    const body = res.data;

    expect(mockCreate.mock.calls[0][0].data.key).toMatch(/^documents\/[0-9a-f-]{36}\.pdf$/);
    expect(signedHeaders(body.presignedUrl)).toContain("content-type");
  });

  it("refuses a content type outside the upload allowlist", async () => {
    await expect(
      call("crm_create_document", { document_name: "x.html", contentType: "text/html" })
    ).rejects.toThrow(/VALIDATION_ERROR/);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("crm_get_upload_url", () => {
  it("signs the content-type header with the document's stored type", async () => {
    mockFindFirst.mockResolvedValue({
      id: "d1",
      key: "documents/abc.pdf",
      document_file_mimeType: "application/pdf",
    });
    const res = await call("crm_get_upload_url", { id: "00000000-0000-4000-8000-000000000001" });
    const body = res.data;

    expect(signedHeaders(body.url)).toContain("content-type");
  });
});
