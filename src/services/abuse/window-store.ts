import { Redis } from "@upstash/redis";

import { getEnv } from "@/config/env";
import { AppError } from "@/lib/errors";

export interface WindowStore {
  increment(key: string, windowSeconds: number): Promise<number>;
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
}

class MemoryWindowStore implements WindowStore {
  private readonly counts = new Map<string, { value: number; expiresAt: number }>();
  private readonly values = new Map<string, { value: string; expiresAt: number }>();

  async increment(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const existing = this.counts.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.counts.set(key, { value: 1, expiresAt: now + windowSeconds * 1000 });
      return 1;
    }
    existing.value += 1;
    return existing.value;
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const existing = this.values.get(key);
    if (existing && existing.expiresAt > now) {
      return false;
    }
    this.values.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }
}

class UpstashWindowStore implements WindowStore {
  private readonly redis: Redis;

  constructor() {
    const env = getEnv();
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      throw new AppError(
        "internal_error",
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for upstash backend",
        500
      );
    }
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN
    });
  }

  async increment(key: string, windowSeconds: number): Promise<number> {
    const value = await this.redis.incr(key);
    if (value === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return value;
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, value, {
      nx: true,
      ex: ttlSeconds
    });
    return result === "OK";
  }
}

let cachedStore: WindowStore | null = null;

export const getWindowStore = (): WindowStore => {
  if (cachedStore) {
    return cachedStore;
  }
  const env = getEnv();
  cachedStore = env.RATE_LIMIT_BACKEND === "memory" ? new MemoryWindowStore() : new UpstashWindowStore();
  return cachedStore;
};
