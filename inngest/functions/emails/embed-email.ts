import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import {
  buildEmbeddingText,
  computeContentHash,
  generateEmbedding,
  toVectorLiteral,
} from "@/inngest/lib/embedding-utils";

export const embedEmail = inngest.createFunction(
  {
    id: "email-embed-email",
    name: "Email: Embed Email",
    concurrency: { limit: 10 },
    triggers: [{ event: "email/embed-email" }],
  },
  async ({ event }: { event: { data: { emailId: string } } }) => {
    const { emailId } = event.data;

    const email = await prismadb.email.findUnique({
      where: { id: emailId },
      select: { id: true, subject: true, bodyText: true, fromEmail: true },
    });
    if (!email) return { skipped: "not found" };

    const text = buildEmbeddingText([email.subject, email.bodyText, email.fromEmail]);
    if (!text) return { skipped: "no embeddable text" };

    const newHash = computeContentHash(text);

    const existing = await prismadb.emailEmbedding.findUnique({
      where: { emailId },
      select: { contentHash: true },
    });
    if (existing?.contentHash === newHash) return { skipped: "hash unchanged" };

    const embedding = await generateEmbedding(text);
    const vector = toVectorLiteral(embedding);

    await prismadb.$executeRaw`
      INSERT INTO "EmailEmbedding" ("id", "emailId", "embedding", "contentHash", "embeddedAt")
      VALUES (gen_random_uuid(), ${emailId}::uuid, ${vector}::vector, ${newHash}, NOW())
      ON CONFLICT ("emailId")
      DO UPDATE SET
        "embedding" = EXCLUDED."embedding",
        "contentHash" = EXCLUDED."contentHash",
        "embeddedAt" = NOW()
    `;

    await inngest.send({
      name: "email/link-crm",
      data: { emailId },
    });

    return { embedded: true, emailId };
  }
);
