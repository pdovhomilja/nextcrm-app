import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from 'ioredis';

const client = new Redis(process.env.REDIS_URL as string);

export const ratelimit = new Ratelimit({
  redis: client,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
  analytics: true,
});

export const loginRateLimit = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: true,
});