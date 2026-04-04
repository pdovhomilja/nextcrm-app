import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import {
  generateEmbedding,
  toVectorLiteral,
  computeContentHash,
} from "@/inngest/lib/embedding-utils";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { minioClient, MINIO_BUCKET } from "@/lib/minio";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHUNK_SIZE = 512; // tokens (approx 4 chars per token)
const CHUNK_OVERLAP = 50;
const MAX_SINGLE_EMBED_CHARS = 8000 * 4; // ~8000 tokens

async function fetchFileBuffer(key: string): Promise<Buffer> {
  const response = await minioClient.send(
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function extractText(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || null;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || null;
  }

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8") || null;
  }

  return null; // images and unsupported types
}

function chunkText(text: string): string[] {
  const charChunkSize = CHUNK_SIZE * 4;
  const charOverlap = CHUNK_OVERLAP * 4;
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + charChunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - charOverlap;
    if (end === text.length) break;
  }
  return chunks;
}

function classifyByFilename(name: string): "RECEIPT" | "CONTRACT" | "OFFER" | "OTHER" {
  const lower = name.toLowerCase();
  if (/invoice|receipt|bill|payment/.test(lower)) return "RECEIPT";
  if (/contract|agreement|nda|terms/.test(lower)) return "CONTRACT";
  if (/offer|quote|proposal|estimate/.test(lower)) return "OFFER";
  return "OTHER";
}

export const enrichDocument = inngest.createFunction(
  {
    id: "document-enrich",
    name: "Enrich Document",
    triggers: [{ event: "document/uploaded" }],
    retries: 3,
  },
  async ({ event, step }) => {
    const { documentId } = event.data as { documentId: string };

    const document = await step.run("load-document", async () => {
      const doc = await prismadb.documents.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          key: true,
          document_name: true,
          document_file_mimeType: true,
          document_system_type: true,
        },
      });
      if (!doc) throw new Error(`Document ${documentId} not found`);
      return doc;
    });

    // Step 1: Extract text
    const contentText = await step.run("extract-text", async () => {
      if (!document.key) return null;

      const buffer = await fetchFileBuffer(document.key);
      const text = await extractText(buffer, document.document_file_mimeType);

      await prismadb.documents.update({
        where: { id: documentId },
        data: {
          content_text: text,
          processing_status: "PROCESSING",
        },
      });

      return text;
    });

    if (!contentText) {
      // Images and unsupported types — apply filename-based classification only
      await step.run("classify-by-filename", async () => {
        const systemType = classifyByFilename(document.document_name);
        await prismadb.documents.update({
          where: { id: documentId },
          data: {
            document_system_type: systemType,
            processing_status: "READY",
          },
        });
      });
      return { documentId, status: "ready", enriched: false };
    }

    // Step 2: Generate embeddings
    await step.run("generate-embedding", async () => {
      if (contentText.length <= MAX_SINGLE_EMBED_CHARS) {
        // Single embedding on the document
        const embedding = await generateEmbedding(contentText);
        const vector = toVectorLiteral(embedding);
        const hash = computeContentHash(contentText);

        await prismadb.$executeRaw`
          INSERT INTO "crm_Embeddings_Documents" ("id", "document_id", "embedding", "content_hash", "embedded_at")
          VALUES (gen_random_uuid(), ${documentId}::uuid, ${vector}::vector, ${hash}, NOW())
          ON CONFLICT ("document_id")
          DO UPDATE SET "embedding" = EXCLUDED."embedding",
                        "content_hash" = EXCLUDED."content_hash",
                        "embedded_at" = NOW()
        `;
      } else {
        // Chunked embeddings
        const chunks = chunkText(contentText);

        // Delete old chunks if re-processing
        await prismadb.crm_Document_Chunks.deleteMany({
          where: { document_id: documentId },
        });

        for (let i = 0; i < chunks.length; i++) {
          const embedding = await generateEmbedding(chunks[i]);
          const vector = toVectorLiteral(embedding);

          await prismadb.$executeRaw`
            INSERT INTO "crm_Document_Chunks" ("id", "document_id", "chunk_index", "chunk_text", "embedding", "embedded_at")
            VALUES (gen_random_uuid(), ${documentId}::uuid, ${i}, ${chunks[i]}, ${vector}::vector, NOW())
          `;
        }
      }
    });

    // Step 3: Generate summary
    const summary = await step.run("generate-summary", async () => {
      const truncated = contentText.slice(0, 12000); // ~3000 tokens for summary input
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Summarize the following document in 2-3 concise sentences. Focus on the key purpose and contents.",
          },
          { role: "user", content: truncated },
        ],
        max_tokens: 200,
      });

      const summaryText = response.choices[0]?.message?.content ?? null;
      await prismadb.documents.update({
        where: { id: documentId },
        data: { summary: summaryText },
      });
      return summaryText;
    });

    // Step 4: AI classification
    await step.run("ai-classify", async () => {
      const truncated = contentText.slice(0, 4000);
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Classify this document into exactly one of these categories: RECEIPT, CONTRACT, OFFER, OTHER. Respond with only the category name, nothing else.",
          },
          {
            role: "user",
            content: `Document name: ${document.document_name}\n\nSummary: ${summary}\n\nContent excerpt:\n${truncated}`,
          },
        ],
        max_tokens: 10,
      });

      const raw = response.choices[0]?.message?.content?.trim().toUpperCase() ?? "OTHER";
      const systemType = ["RECEIPT", "CONTRACT", "OFFER", "OTHER"].includes(raw)
        ? (raw as "RECEIPT" | "CONTRACT" | "OFFER" | "OTHER")
        : "OTHER";

      await prismadb.documents.update({
        where: { id: documentId },
        data: {
          document_system_type: systemType,
          processing_status: "READY",
        },
      });
    });

    return { documentId, status: "ready", enriched: true };
  }
);
