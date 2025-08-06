import { embed, embedMany } from "ai";
import { aiConfig } from "./config";
import { createHash } from "crypto";

export class EmbeddingService {
  private static instance: EmbeddingService;
  private cache: Map<string, { embedding: number[]; timestamp: number }> =
    new Map();

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate content hash for caching and deduplication
   */
  private generateContentHash(content: string): string {
    return createHash("sha256")
      .update(content.trim().toLowerCase())
      .digest("hex");
  }

  /**
   * Get embedding from cache if available and not expired
   */
  private getCachedEmbedding(contentHash: string): number[] | null {
    if (!aiConfig.optimization.enableCaching) return null;

    const cached = this.cache.get(contentHash);
    if (cached) {
      const isExpired =
        Date.now() - cached.timestamp >
        aiConfig.optimization.cacheExpiryHours * 60 * 60 * 1000;

      if (!isExpired) {
        return cached.embedding;
      } else {
        this.cache.delete(contentHash);
      }
    }
    return null;
  }

  /**
   * Cache embedding for future use
   */
  private cacheEmbedding(contentHash: string, embedding: number[]): void {
    if (!aiConfig.optimization.enableCaching) return;

    this.cache.set(contentHash, {
      embedding,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate single embedding with caching and optimization
   */
  async generateEmbedding(content: string): Promise<number[]> {
    if (!content?.trim()) {
      throw new Error("Content cannot be empty");
    }

    // Truncate content if too long
    const truncatedContent =
      content.length > aiConfig.optimization.maxContentLength
        ? content.substring(0, aiConfig.optimization.maxContentLength)
        : content;

    const contentHash = this.generateContentHash(truncatedContent);

    // Check cache first
    const cachedEmbedding = this.getCachedEmbedding(contentHash);
    if (cachedEmbedding) {
      return cachedEmbedding;
    }

    // Generate new embedding
    try {
      const { embedding } = await embed({
        model: aiConfig.embeddingModel,
        value: truncatedContent,
      });

      // Cache the result
      this.cacheEmbedding(contentHash, embedding);

      return embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw new Error(
        `Embedding generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate multiple embeddings efficiently
   */
  async generateEmbeddings(contents: string[]): Promise<number[][]> {
    if (!contents.length) return [];

    const processedContents: string[] = [];
    const contentHashes: string[] = [];
    const cachedResults: (number[] | null)[] = [];

    // Process and check cache for each content
    for (const content of contents) {
      if (!content?.trim()) {
        cachedResults.push(null);
        contentHashes.push("");
        processedContents.push("");
        continue;
      }

      const truncated =
        content.length > aiConfig.optimization.maxContentLength
          ? content.substring(0, aiConfig.optimization.maxContentLength)
          : content;

      const hash = this.generateContentHash(truncated);
      const cached = this.getCachedEmbedding(hash);

      contentHashes.push(hash);
      processedContents.push(truncated);
      cachedResults.push(cached);
    }

    // Find items that need new embeddings
    const needEmbedding: { index: number; content: string; hash: string }[] =
      [];
    cachedResults.forEach((cached, index) => {
      if (cached === null && processedContents[index]?.trim()) {
        needEmbedding.push({
          index,
          content: processedContents[index],
          hash: contentHashes[index],
        });
      }
    });

    // Generate embeddings for non-cached items
    let newEmbeddings: number[][] = [];
    if (needEmbedding.length > 0) {
      try {
        const { embeddings } = await embedMany({
          model: aiConfig.embeddingModel,
          values: needEmbedding.map((item) => item.content),
        });
        newEmbeddings = embeddings;

        // Cache new embeddings
        needEmbedding.forEach((item, embeddingIndex) => {
          this.cacheEmbedding(item.hash, newEmbeddings[embeddingIndex]);
        });
      } catch (error) {
        console.error("Failed to generate batch embeddings:", error);
        throw new Error(
          `Batch embedding generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Combine cached and new embeddings
    const results: number[][] = [];
    let newEmbeddingIndex = 0;

    cachedResults.forEach((cached, index) => {
      if (cached !== null) {
        results.push(cached);
      } else if (processedContents[index]?.trim()) {
        results.push(newEmbeddings[newEmbeddingIndex]);
        newEmbeddingIndex++;
      } else {
        // Handle empty content - throw error or return empty array?
        throw new Error(`Empty content at index ${index}`);
      }
    });

    return results;
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Will be implemented with proper metrics
    };
  }

  /**
   * Health check for embedding service
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Test with a simple embedding
      await this.generateEmbedding("Health check test");
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const embeddingService = EmbeddingService.getInstance();
