import { tool } from "ai";
import { z } from "zod/v3";
import { ragProcessor, RAGQuery } from "../rag-processor"; // Assuming rag-processor exports these

export const ragTools = {
  rag_search: tool({
    description:
      "Search the knowledge base for relevant documents and context to answer a user query.",
    inputSchema: z.object({
      searchText: z
        .string()
        .describe("The text to search for in the knowledge base."),
    }),
    /**
     * Executes a RAG search.
     * Note: The original `processWithRAG` used a `contextType`. This will be determined by the routing agent in Phase 2.
     * For now, we'll default to 'general'.
     */
    execute: async ({ searchText }: { searchText: string }) => {
      const ragQuery: RAGQuery = {
        query: searchText,
        // These will be filled by the agent context later
        companyId: "",
        userId: "",
        contextType: "general",
      };
      console.log(`Executing RAG search for: "${searchText}"`);
      const results = await ragProcessor.processQuery(ragQuery);
      return { results };
    },
  }),
};
