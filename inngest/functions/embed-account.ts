import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import {
  buildEmbeddingText,
  computeContentHash,
  generateEmbedding,
  toVectorLiteral,
} from "@/inngest/lib/embedding-utils";

export const embedAccount = inngest.createFunction(
  { id: "embed-account", name: "Embed Account", triggers: [{ event: "crm/account.saved" }] },
  async ({ event }) => {
    const { record_id } = event.data as { record_id: string };

    const account = await prismadb.crm_Accounts.findUnique({
      where: { id: record_id },
      select: { id: true, name: true, description: true, email: true },
    });
    if (!account) return { skipped: "record not found" };

    const text = buildEmbeddingText([account.name, account.description, account.email]);
    if (!text) return { skipped: "no embeddable text" };

    const newHash = computeContentHash(text);

    const existing = await prismadb.crm_Embeddings_Accounts.findUnique({
      where: { account_id: record_id },
      select: { content_hash: true },
    });
    if (existing?.content_hash === newHash) return { skipped: "hash unchanged" };

    const embedding = await generateEmbedding(text);
    const vector = toVectorLiteral(embedding);

    await prismadb.$executeRaw`
      INSERT INTO "crm_Embeddings_Accounts" ("account_id", "embedding", "content_hash", "embedded_at")
      VALUES (${record_id}::uuid, ${vector}::vector, ${newHash}, NOW())
      ON CONFLICT ("account_id")
      DO UPDATE SET "embedding" = EXCLUDED."embedding",
                    "content_hash" = EXCLUDED."content_hash",
                    "embedded_at" = NOW()
    `;

    return { embedded: true, account_id: record_id };
  }
);
