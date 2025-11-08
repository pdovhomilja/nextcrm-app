/**
 * Redis Cache Service
 * Handles caching, sessions, rate limiting, and real-time features
 */

import { createClient, RedisClientType } from 'redis';

export class RedisService {
  private client: RedisClientType | null = null;
  private connected = false;
  private readonly keyPrefix = process.env.REDIS_KEY_PREFIX || 'nextcrm:';
  private readonly ttlDefault = 3600; // 1 hour default

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB || '0'),
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      });

      this.client.on('error', (err) => console.error('Redis error:', err));
      this.client.on('connect', () => console.log('Redis connected'));

      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Set cache value
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.client) await this.connect();

    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const serialized = JSON.stringify(value);

      if (ttl) {
        await this.client!.setEx(fullKey, ttl, serialized);
      } else {
        await this.client!.set(fullKey, serialized);
      }
    } catch (error) {
      console.error('Redis SET error:', error);
    }
  }

  /**
   * Get cache value
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) await this.connect();

    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const value = await this.client!.get(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Delete cache value
   */
  async delete(key: string): Promise<void> {
    if (!this.client) await this.connect();

    try {
      const fullKey = `${this.keyPrefix}${key}`;
      await this.client!.del(fullKey);
    } catch (error) {
      console.error('Redis DELETE error:', error);
    }
  }

  /**
   * Delete multiple cache values
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (!this.client) await this.connect();

    try {
      const fullKeys = keys.map((k) => `${this.keyPrefix}${k}`);
      if (fullKeys.length > 0) {
        await this.client!.del(fullKeys);
      }
    } catch (error) {
      console.error('Redis DELETE MANY error:', error);
    }
  }

  /**
   * Clear all cache with pattern
   */
  async clear(pattern?: string): Promise<void> {
    if (!this.client) await this.connect();

    try {
      const scanPattern = pattern ? `${this.keyPrefix}${pattern}*` : `${this.keyPrefix}*`;
      const keys: string[] = [];

      for await (const key of this.client!.scanIterator({ MATCH: scanPattern })) {
        keys.push(key);
      }

      if (keys.length > 0) {
        await this.client!.del(keys);
      }
    } catch (error) {
      console.error('Redis CLEAR error:', error);
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, ttl?: number): Promise<number> {
    if (!this.client) await this.connect();

    try {
      const fullKey = `${this.keyPrefix}${key}`;
      const value = await this.client!.incr(fullKey);

      if (ttl && value === 1) {
        await this.client!.expire(fullKey, ttl);
      }

      return value;
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 0;
    }
  }

  /**
   * Rate limiting
   */
  async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    if (!this.client) await this.connect();

    try {
      const fullKey = `${this.keyPrefix}ratelimit:${key}`;
      const current = await this.increment(fullKey, windowSeconds);

      return {
        allowed: current <= maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: maxRequests, resetAt: new Date() };
    }
  }

  /**
   * Session management
   */
  async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  async getSession<T = any>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.delete(`session:${sessionId}`);
  }

  /**
   * Pub/Sub for real-time features
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.client) await this.connect();

    try {
      const subscriber = this.client!.duplicate();
      await subscriber.connect();

      await subscriber.subscribe(channel, (message) => {
        callback(message);
      });
    } catch (error) {
      console.error('Subscribe error:', error);
    }
  }

  /**
   * Publish message
   */
  async publish(channel: string, message: string): Promise<void> {
    if (!this.client) await this.connect();

    try {
      await this.client!.publish(channel, message);
    } catch (error) {
      console.error('Publish error:', error);
    }
  }

  /**
   * Disconnect Redis client
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.connected = false;
    }
  }
}

export const redisService = new RedisService();
