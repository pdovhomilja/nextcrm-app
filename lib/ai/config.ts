import { openai } from "@ai-sdk/openai";

export const aiConfig = {
  // Embedding model configuration
  embeddingModel: openai.embedding(
    process.env.EMBEDDING_MODEL || "text-embedding-ada-002",
  ),

  // Chat model for analysis - using gpt-4o for structured output support
  chatModel: openai(process.env.AI_MODEL || "gpt-5-mini"),

  // More powerful model for complex reasoning and multi-step tasks
  powerfulChatModel: openai(process.env.AI_POWERFUL_MODEL || "gpt-5"),

  // Structured output model - always use gpt-4o for generateObject calls
  structuredOutputModel: openai(process.env.AI_STRUCTURED_MODEL || "gpt-5"),

  // Embedding settings
  embedding: {
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1536"),
    batchSize: 100, // Process 100 items at once
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },

  // Cost optimization
  optimization: {
    enableCaching: true,
    cacheExpiryHours: 24,
    enableDeduplication: true,
    maxContentLength: 8192, // OpenAI limit
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerMinute: 150000,
  },

  // Feature flags
  features: {
    enabled: process.env.AI_FEATURES_ENABLED === "true",
    mcpEnabled: process.env.MCP_TOOLS_ENABLED === "true",
    vectorSearchEnabled: process.env.PGVECTOR_ENABLED === "true",
  },
};

export const EMBEDDING_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

// Validation function
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.OPENAI_API_KEY) {
    errors.push("OPENAI_API_KEY environment variable is required");
  }

  if (!aiConfig.features.enabled) {
    errors.push("AI features are disabled. Set AI_FEATURES_ENABLED=true");
  }

  if (aiConfig.embedding.dimensions !== 1536) {
    errors.push("Embedding dimensions must be 1536 for text-embedding-ada-002");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
