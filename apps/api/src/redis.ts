import Redis from 'ioredis';
import { config } from './config';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

/** Dedicated connection for BullMQ — requires maxRetriesPerRequest: null */
export const bullmqRedis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// TTL constants (seconds)
export const TTL = {
  REFRESH_TOKEN: 30 * 24 * 60 * 60, // 30 days
  DRIVER_JOB_LOCK: 30, // 30 seconds
  RATE_LIMIT: 60, // 1 minute
} as const;

/** Acquire a Redis lock. Returns true if lock acquired, false if already locked. */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await redis.set(`lock:${key}`, '1', 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function releaseLock(key: string): Promise<void> {
  await redis.del(`lock:${key}`);
}
