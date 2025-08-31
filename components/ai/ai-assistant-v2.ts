import { aiConfig } from "@/lib/ai/config";
import db from "@/lib/db";
import { embed } from "ai";

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: aiConfig.embeddingModel,
    value: input,
  });
  return embedding;
};

interface SimilarResult {
  name: string;
  similarity: number;
  boardId: string; // Add boardId to the interface
  taskId: string; // This will hold the task id
}

export const findRelevantContent = async (
  userQuery: string,
  companyId: string,
): Promise<SimilarResult[]> => {
  const queryEmbedding = await generateEmbedding(userQuery);

  const embeddingVector = `[${queryEmbedding.join(",")}]`;
  const threshold = 0.5;
  const limit = 5;

  const results = await db.$queryRaw<SimilarResult[]>`
    SELECT 
      te.content AS name,
      1 - (te.embedding <=> ${embeddingVector}::vector) AS similarity,
      bs."boardId" AS "boardId",
      t.id AS "taskId"
    FROM task_embeddings te
    JOIN "Task" t ON t.id = te.task_id
    JOIN "BoardSection" bs ON bs.id = t."boardSectionId"
    JOIN "Board" b ON b.id = bs."boardId"
    JOIN "users" u ON u.id = t."assignedToId"
    JOIN "company_memberships" cm ON cm."userId" = u.id
    WHERE 1 - (te.embedding <=> ${embeddingVector}::vector) > ${threshold}
      AND cm."companyId" = ${companyId}
      AND t.status NOT IN ('COMPLETED', 'CANCELLED') AND t.status IS NOT NULL
    ORDER BY te.embedding <=> ${embeddingVector}::vector
    LIMIT ${limit}
  `;

  console.log("Results", results);

  return results;
};
