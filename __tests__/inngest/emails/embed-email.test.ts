// Tests the content-hash short-circuit path
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    email: {
      findUnique: jest.fn(),
    },
    emailEmbedding: {
      findUnique: jest.fn(),
    },
    $executeRaw: jest.fn(),
  },
}));
jest.mock("@/inngest/lib/embedding-utils", () => ({
  buildEmbeddingText: jest.fn().mockReturnValue("subject body"),
  computeContentHash: jest.fn().mockReturnValue("hash-abc"),
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]),
  toVectorLiteral: jest.fn().mockReturnValue("[0.1,0.2]"),
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { prismadb } from "@/lib/prisma";
import { computeContentHash } from "@/inngest/lib/embedding-utils";

describe("embed-email: hash-skip path", () => {
  it("skips embedding when content hash is unchanged", async () => {
    const mockEmail = { id: "e1", subject: "Hi", bodyText: "Hello", fromEmail: "a@b.com" };
    (prismadb.email.findUnique as jest.Mock).mockResolvedValue(mockEmail);
    (prismadb.emailEmbedding.findUnique as jest.Mock).mockResolvedValue({
      contentHash: "hash-abc",
    });

    const text = "subject body";
    const newHash = (computeContentHash as jest.Mock)(text);
    const existing = await prismadb.emailEmbedding.findUnique({ where: { emailId: "e1" }, select: { contentHash: true } });

    expect(existing?.contentHash).toBe(newHash);
    expect(prismadb.$executeRaw).not.toHaveBeenCalled();
  });
});
