/**
 * Redis Service Tests
 */

import { RedisService } from '@/lib/cache/redis';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.REDIS_PASSWORD = 'test-password';
    process.env.REDIS_KEY_PREFIX = 'test:';
  });

  describe('set and get', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { name: 'test', id: 123 };

      await service.set(key, value, 3600);
      const retrieved = await service.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should handle TTL expiration', async () => {
      const key = 'test-key';
      const value = { test: 'data' };

      // Set with 1 second TTL
      await service.set(key, value, 1);

      // Immediate retrieval should work
      const retrieved = await service.get(key);
      expect(retrieved).toEqual(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const expired = await service.get(key);
      expect(expired).toBeNull();
    });

    it('should handle null values', async () => {
      const key = 'non-existent-key';
      const retrieved = await service.get(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('delete operations', () => {
    it('should delete a single key', async () => {
      const key = 'test-key';
      await service.set(key, { data: 'test' });

      await service.delete(key);
      const retrieved = await service.get(key);

      expect(retrieved).toBeNull();
    });

    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];

      for (const key of keys) {
        await service.set(key, { id: key });
      }

      await service.deleteMany(keys);

      for (const key of keys) {
        const retrieved = await service.get(key);
        expect(retrieved).toBeNull();
      }
    });
  });

  describe('rate limiting', () => {
    it('should track and limit requests', async () => {
      const key = 'user:123:api-calls';
      const limit = 3;
      const ttl = 60;

      // First 3 calls should succeed
      for (let i = 0; i < limit; i++) {
        const result = await service.checkRateLimit(key, limit, ttl);
        expect(result.allowed).toBe(true);
      }

      // Fourth call should be rejected
      const result = await service.checkRateLimit(key, limit, ttl);
      expect(result.allowed).toBe(false);
    });

    it('should reset rate limit after TTL', async () => {
      const key = 'user:456:api-calls';
      const limit = 1;
      const ttl = 1; // 1 second

      // First call should succeed
      let result = await service.checkRateLimit(key, limit, ttl);
      expect(result.allowed).toBe(true);

      // Second call should fail
      result = await service.checkRateLimit(key, limit, ttl);
      expect(result.allowed).toBe(false);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again
      result = await service.checkRateLimit(key, limit, ttl);
      expect(result.allowed).toBe(true);
    });
  });
});
