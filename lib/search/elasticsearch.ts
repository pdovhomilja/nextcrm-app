/**
 * Elasticsearch Full-Text Search Service
 * Provides comprehensive search across all tenant documents
 */

import { Client } from '@elastic/elasticsearch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SearchDocument {
  id: string;
  tenantId: string;
  type: 'invoice' | 'contact' | 'document' | 'note' | 'email';
  title: string;
  content: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  content: string;
  score: number;
  metadata?: any;
}

export class ElasticsearchService {
  private client: Client | null = null;
  private indexPrefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'nextcrm';

  constructor() {
    if (!this.isConfigured()) {
      throw new Error('Elasticsearch is not configured');
    }
  }

  /**
   * Check if Elasticsearch is configured
   */
  private isConfigured(): boolean {
    return (
      !!process.env.ELASTICSEARCH_URL &&
      !!process.env.ELASTICSEARCH_USERNAME &&
      !!process.env.ELASTICSEARCH_PASSWORD
    );
  }

  /**
   * Connect to Elasticsearch
   */
  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      this.client = new Client({
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME!,
          password: process.env.ELASTICSEARCH_PASSWORD!,
        },
      });

      // Test connection
      const response = await this.client.info();
      console.log('Connected to Elasticsearch:', response.version?.number);
    } catch (error) {
      console.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Create or update index for tenant
   */
  async createIndex(tenantId: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    const indexName = `${this.indexPrefix}-${tenantId}`;

    try {
      const exists = await this.client!.indices.exists({ index: indexName });

      if (!exists) {
        await this.client!.indices.create({
          index: indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 1,
              analysis: {
                analyzer: {
                  default: {
                    type: 'standard',
                    stopwords: '_english_',
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                tenantId: { type: 'keyword' },
                type: { type: 'keyword' },
                title: {
                  type: 'text',
                  analyzer: 'standard',
                  fields: { keyword: { type: 'keyword' } },
                },
                content: {
                  type: 'text',
                  analyzer: 'standard',
                },
                metadata: { type: 'object', enabled: false },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
              },
            },
          },
        });

        console.log(`Created Elasticsearch index: ${indexName}`);
      }
    } catch (error) {
      console.error(`Error creating Elasticsearch index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Index a document
   */
  async indexDocument(
    tenantId: string,
    document: SearchDocument
  ): Promise<string> {
    if (!this.client) {
      await this.connect();
    }

    const indexName = `${this.indexPrefix}-${tenantId}`;

    try {
      const result = await this.client!.index({
        index: indexName,
        id: document.id,
        body: {
          ...document,
          createdAt: document.createdAt.toISOString(),
          updatedAt: document.updatedAt.toISOString(),
        },
      });

      return result._id;
    } catch (error) {
      console.error(`Error indexing document ${document.id}:`, error);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(
    tenantId: string,
    documents: SearchDocument[]
  ): Promise<{ success: number; failed: number }> {
    if (!this.client) {
      await this.connect();
    }

    const indexName = `${this.indexPrefix}-${tenantId}`;

    try {
      const body = documents.flatMap((doc) => [
        { index: { _index: indexName, _id: doc.id } },
        {
          ...doc,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        },
      ]);

      const result = await this.client!.bulk({ body });

      let success = 0;
      let failed = 0;

      for (const item of result.items) {
        if (item.index?.error) {
          failed++;
        } else {
          success++;
        }
      }

      return { success, failed };
    } catch (error) {
      console.error('Error bulk indexing documents:', error);
      throw error;
    }
  }

  /**
   * Full-text search
   */
  async search(
    tenantId: string,
    query: string,
    options: {
      type?: string;
      limit?: number;
      offset?: number;
      dateRange?: { from: Date; to: Date };
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.client) {
      await this.connect();
    }

    const indexName = `${this.indexPrefix}-${tenantId}`;
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    try {
      const filters: any[] = [];

      // Filter by type if provided
      if (options.type) {
        filters.push({ term: { type: options.type } });
      }

      // Filter by date range if provided
      if (options.dateRange) {
        filters.push({
          range: {
            createdAt: {
              gte: options.dateRange.from.toISOString(),
              lte: options.dateRange.to.toISOString(),
            },
          },
        });
      }

      const body: any = {
        size: limit,
        from: offset,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ['title^2', 'content'],
                  fuzziness: 'AUTO',
                },
              },
            ],
            filter: filters,
          },
        },
        highlight: {
          fields: {
            title: {},
            content: { fragment_size: 150, number_of_fragments: 3 },
          },
        },
      };

      const result = await this.client!.search({
        index: indexName,
        body,
      });

      return (result.hits.hits || []).map((hit: any) => ({
        id: hit._id,
        type: hit._source.type,
        title: hit._source.title,
        content: hit._source.content,
        score: hit._score,
        metadata: hit._source.metadata,
      }));
    } catch (error) {
      console.error('Error searching Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Delete document from index
   */
  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    const indexName = `${this.indexPrefix}-${tenantId}`;

    try {
      await this.client!.delete({
        index: indexName,
        id: documentId,
      });
    } catch (error) {
      // Silently ignore if document doesn't exist
      if ((error as any)?.statusCode !== 404) {
        console.error(`Error deleting document ${documentId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Clear all documents for a tenant
   */
  async clearIndex(tenantId: string): Promise<number> {
    if (!this.client) {
      await this.connect();
    }

    const indexName = `${this.indexPrefix}-${tenantId}`;

    try {
      const result = await this.client!.delete_by_query({
        index: indexName,
        body: {
          query: {
            match_all: {},
          },
        },
      });

      return result.deleted || 0;
    } catch (error) {
      console.error(`Error clearing index ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(tenantId: string): Promise<{
    documentCount: number;
    indexSize: string;
  }> {
    if (!this.client) {
      await this.connect();
    }

    const indexName = `${this.indexPrefix}-${tenantId}`;

    try {
      const stats = await this.client!.indices.stats({ index: indexName });
      const indexStats = (stats.indices || {})[indexName];

      return {
        documentCount: indexStats?.primaries?.docs?.count || 0,
        indexSize: indexStats?.primaries?.store?.size || '0B',
      };
    } catch (error) {
      console.error(`Error getting index stats for ${indexName}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from Elasticsearch
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
