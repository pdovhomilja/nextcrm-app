/**
 * Vector Database Service
 * Handles semantic search using OpenAI embeddings and Pinecone vector DB
 */

import { PrismaClient } from '@prisma/client';
import { redisService } from '../cache/redis';

const prisma = new PrismaClient();

interface EmbeddingResult {
  vector: number[];
  model: string;
  tokens: number;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  contentType: string;
  similarity: number;
  metadata?: any;
}

export class VectorDBService {
  private readonly openaiApiKey = process.env.OPENAI_API_KEY;
  private readonly embeddingModel = 'text-embedding-3-small';

  /**
   * Generate embeddings for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: this.embeddingModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      return {
        vector: data.data[0].embedding,
        model: data.model,
        tokens: data.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Store document with embeddings
   */
  async storeDocument(
    tenantId: string,
    title: string,
    content: string,
    contentType: string,
    contentId?: string,
    metadata?: any,
    userId?: string
  ): Promise<{
    id: string;
    embedding: number[];
  }> {
    try {
      // Generate embedding
      const { vector } = await this.generateEmbedding(content);

      // Store in database
      const doc = await prisma.vector_Documents.create({
        data: {
          tenant_id: tenantId,
          title,
          content,
          content_type: contentType,
          content_id: contentId,
          embedding: vector,
          metadata,
          created_by: userId,
        },
      });

      // Cache for quick access
      await redisService.set(`vector:${doc.id}`, { ...doc, embedding: undefined }, 3600);

      return {
        id: doc.id,
        embedding: vector,
      };
    } catch (error) {
      console.error('Error storing document:', error);
      throw error;
    }
  }

  /**
   * Semantic search across tenant documents
   */
  async semanticSearch(
    tenantId: string,
    query: string,
    limit = 10,
    contentType?: string,
    threshold = 0.7
  ): Promise<SearchResult[]> {
    try {
      // Generate query embedding
      const { vector: queryVector } = await this.generateEmbedding(query);

      // Find similar documents in database
      // Note: MongoDB Atlas Vector Search would be used here in production
      const documents = await prisma.vector_Documents.findMany({
        where: {
          tenant_id: tenantId,
          content_type: contentType,
        },
        take: limit * 2, // Fetch more for filtering
      });

      // Calculate similarity scores (cosine similarity)
      const results = documents
        .map((doc) => {
          const embedding = doc.embedding as number[];
          const similarity = this.cosineSimilarity(queryVector, embedding);

          return {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            contentType: doc.content_type,
            similarity,
            metadata: doc.metadata,
          };
        })
        .filter((r) => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      // Update similarity scores in database
      for (const result of results) {
        await prisma.vector_Documents.update({
          where: { id: result.id },
          data: { similarity_score: result.similarity },
        });
      }

      return results;
    } catch (error) {
      console.error('Error performing semantic search:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Delete document from vector store
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await prisma.vector_Documents.delete({
        where: { id: documentId },
      });

      await redisService.delete(`vector:${documentId}`);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(
    tenantId: string,
    documents: Array<{
      title: string;
      content: string;
      contentType: string;
      contentId?: string;
      metadata?: any;
    }>
  ): Promise<Array<{ id: string; success: boolean; error?: string }>> {
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const doc of documents) {
      try {
        const result = await this.storeDocument(
          tenantId,
          doc.title,
          doc.content,
          doc.contentType,
          doc.contentId,
          doc.metadata
        );

        results.push({ id: result.id, success: true });
      } catch (error) {
        results.push({
          id: doc.contentId || 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Clear all documents for a tenant
   */
  async clearTenantDocuments(tenantId: string): Promise<number> {
    try {
      const result = await prisma.vector_Documents.deleteMany({
        where: { tenant_id: tenantId },
      });

      await redisService.clear(`vector:${tenantId}`);

      return result.count;
    } catch (error) {
      console.error('Error clearing documents:', error);
      throw error;
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(tenantId: string): Promise<{
    totalDocuments: number;
    byContentType: Record<string, number>;
  }> {
    try {
      const docs = await prisma.vector_Documents.findMany({
        where: { tenant_id: tenantId },
        select: { content_type: true },
      });

      const byContentType: Record<string, number> = {};
      for (const doc of docs) {
        byContentType[doc.content_type] = (byContentType[doc.content_type] || 0) + 1;
      }

      return {
        totalDocuments: docs.length,
        byContentType,
      };
    } catch (error) {
      console.error('Error getting document stats:', error);
      throw error;
    }
  }
}

export const vectorDBService = new VectorDBService();
