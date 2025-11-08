/**
 * Vector DB Service Tests
 */

import { VectorDBService } from '@/lib/ai/vectordb';

describe('VectorDBService', () => {
  let service: VectorDBService;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    service = new VectorDBService();
  });

  describe('cosine similarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const a = [1, 0, 0];
      const b = [1, 0, 0];

      // Same vectors should have similarity of 1
      const similarity = service['cosineSimilarity'](a, b);
      expect(similarity).toBeCloseTo(1, 2);
    });

    it('should handle orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];

      // Orthogonal vectors should have similarity of 0
      const similarity = service['cosineSimilarity'](a, b);
      expect(similarity).toBeCloseTo(0, 2);
    });

    it('should handle opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];

      // Opposite vectors should have similarity of -1
      const similarity = service['cosineSimilarity'](a, b);
      expect(similarity).toBeCloseTo(-1, 2);
    });

    it('should throw error for vectors of different lengths', () => {
      const a = [1, 0, 0];
      const b = [1, 0];

      expect(() => {
        service['cosineSimilarity'](a, b);
      }).toThrow('Vectors must have same length');
    });
  });

  describe('error handling', () => {
    it('should throw error if OPENAI_API_KEY is not configured', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        service.generateEmbedding('test text');
      }).toThrow('OPENAI_API_KEY not configured');
    });

    it('should handle empty vectors', () => {
      const a: number[] = [];
      const b: number[] = [];

      const similarity = service['cosineSimilarity'](a, b);
      // Empty vectors have NaN similarity
      expect(isNaN(similarity) || similarity === 0).toBe(true);
    });
  });

  describe('document operations', () => {
    it('should validate document parameters', async () => {
      // Test with missing required parameters
      expect(async () => {
        await service.storeDocument('', 'title', 'content', 'invoice');
      }).rejects.toThrow();
    });
  });
});
