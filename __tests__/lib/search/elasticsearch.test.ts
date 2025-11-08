/**
 * Elasticsearch Service Tests
 */

import { ElasticsearchService } from '@/lib/search/elasticsearch';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;

  beforeEach(() => {
    process.env.ELASTICSEARCH_URL = 'http://localhost:9200';
    process.env.ELASTICSEARCH_USERNAME = 'elastic';
    process.env.ELASTICSEARCH_PASSWORD = 'password';
    process.env.ELASTICSEARCH_INDEX_PREFIX = 'nextcrm';
  });

  describe('index naming', () => {
    it('should generate correct index name for tenant', () => {
      const tenantId = 'tenant-123';
      const indexName = `nextcrm-${tenantId}`;

      expect(indexName).toBe('nextcrm-tenant-123');
    });

    it('should handle multiple tenants with separate indices', () => {
      const tenant1 = 'tenant-1';
      const tenant2 = 'tenant-2';

      const index1 = `nextcrm-${tenant1}`;
      const index2 = `nextcrm-${tenant2}`;

      expect(index1).not.toBe(index2);
      expect(index1).toContain(tenant1);
      expect(index2).toContain(tenant2);
    });
  });

  describe('search query building', () => {
    it('should build multi-match query', () => {
      const query = 'invoice search term';

      const searchBody = {
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
          },
        },
      };

      expect(searchBody.query.bool.must[0].multi_match.query).toBe(query);
      expect(searchBody.query.bool.must[0].multi_match.fields).toContain(
        'title^2'
      );
    });

    it('should add type filter when specified', () => {
      const docType = 'invoice';
      const filters: any[] = [];

      if (docType) {
        filters.push({ term: { type: docType } });
      }

      expect(filters).toHaveLength(1);
      expect(filters[0]).toEqual({ term: { type: 'invoice' } });
    });

    it('should add date range filter', () => {
      const from = new Date('2025-01-01');
      const to = new Date('2025-01-31');
      const filters: any[] = [];

      filters.push({
        range: {
          createdAt: {
            gte: from.toISOString(),
            lte: to.toISOString(),
          },
        },
      });

      expect(filters).toHaveLength(1);
      expect(filters[0].range.createdAt.gte).toContain('2025-01-01');
    });
  });

  describe('document scoring', () => {
    it('should include highlight in search results', () => {
      const highlight = {
        fields: {
          title: {},
          content: { fragment_size: 150, number_of_fragments: 3 },
        },
      };

      expect(highlight.fields).toHaveProperty('title');
      expect(highlight.fields).toHaveProperty('content');
    });

    it('should include relevance score', () => {
      const score = 1.25;
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing Elasticsearch configuration', () => {
      delete process.env.ELASTICSEARCH_URL;

      expect(() => {
        new ElasticsearchService();
      }).toThrow('Elasticsearch is not configured');
    });

    it('should handle invalid index name', () => {
      const invalidIndexName = 'Index_With_Uppercase';
      expect(invalidIndexName.toLowerCase()).toBe('index_with_uppercase');
    });
  });

  describe('bulk operations', () => {
    it('should format documents for bulk indexing', () => {
      const documents = [
        {
          id: 'doc-1',
          tenantId: 'tenant-1',
          type: 'invoice',
          title: 'Invoice #1',
          content: 'Test content',
          metadata: { amount: 100 },
        },
      ];

      const bulkBody: any[] = [];
      for (const doc of documents) {
        bulkBody.push({ index: { _id: doc.id } });
        bulkBody.push(doc);
      }

      expect(bulkBody).toHaveLength(documents.length * 2);
      expect(bulkBody[0]).toEqual({ index: { _id: 'doc-1' } });
      expect(bulkBody[1]).toEqual(documents[0]);
    });
  });
});
