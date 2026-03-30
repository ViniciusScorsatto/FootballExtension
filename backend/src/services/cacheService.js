import { createClient } from "redis";

function now() {
  return Date.now();
}

class InMemoryStore {
  constructor() {
    this.values = new Map();
    this.sortedScores = new Map();
    this.counters = new Map();
  }

  get(key) {
    const entry = this.values.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= now()) {
      this.values.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlSeconds) {
    this.values.set(key, {
      value,
      expiresAt: now() + ttlSeconds * 1000
    });
  }

  incrementCounter(key, ttlSeconds, amount = 1) {
    const existingEntry = this.counters.get(key);

    if (!existingEntry || existingEntry.expiresAt <= now()) {
      const freshEntry = {
        count: amount,
        expiresAt: now() + ttlSeconds * 1000
      };

      this.counters.set(key, freshEntry);
      return freshEntry;
    }

    existingEntry.count += amount;
    return existingEntry;
  }

  incrementScore(key, member, amount = 1) {
    if (!this.sortedScores.has(key)) {
      this.sortedScores.set(key, new Map());
    }

    const scoreMap = this.sortedScores.get(key);
    scoreMap.set(member, (scoreMap.get(member) ?? 0) + amount);
  }

  getTopScores(key, limit = 5) {
    const scoreMap = this.sortedScores.get(key);

    if (!scoreMap) {
      return [];
    }

    return [...scoreMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([member, score]) => ({
        member,
        score
      }));
  }
}

export class CacheService {
  constructor({ redisUrl }) {
    this.redisUrl = redisUrl;
    this.memoryStore = new InMemoryStore();
    this.client = null;
    this.redisEnabled = false;
  }

  async connect() {
    if (!this.redisUrl) {
      return;
    }

    try {
      const client = createClient({ url: this.redisUrl });

      client.on("error", (error) => {
        console.error("Redis error:", error.message);
      });

      await client.connect();
      this.client = client;
      this.redisEnabled = true;
      console.info("Redis cache enabled.");
    } catch (error) {
      console.warn("Redis unavailable, using in-memory cache:", error.message);
      this.client = null;
      this.redisEnabled = false;
    }
  }

  async getJson(key) {
    if (this.redisEnabled && this.client) {
      const rawValue = await this.client.get(key);
      return rawValue ? JSON.parse(rawValue) : null;
    }

    return this.memoryStore.get(key);
  }

  async setJson(key, value, ttlSeconds) {
    if (this.redisEnabled && this.client) {
      await this.client.set(key, JSON.stringify(value), {
        EX: ttlSeconds
      });
      return;
    }

    this.memoryStore.set(key, value, ttlSeconds);
  }

  async incrementScore(key, member, amount = 1) {
    if (this.redisEnabled && this.client) {
      await this.client.zIncrBy(key, amount, member);
      return;
    }

    this.memoryStore.incrementScore(key, member, amount);
  }

  async getTopScores(key, limit = 5) {
    if (this.redisEnabled && this.client) {
      const entries = await this.client.zRangeWithScores(key, 0, limit - 1, {
        REV: true
      });

      return entries.map((entry) => ({
        member: entry.value,
        score: Number(entry.score)
      }));
    }

    return this.memoryStore.getTopScores(key, limit);
  }

  async incrementCounter(key, ttlSeconds, amount = 1) {
    if (this.redisEnabled && this.client) {
      const count = await this.client.incrBy(key, amount);

      if (count === amount) {
        await this.client.expire(key, ttlSeconds);
      }

      const ttl = await this.client.ttl(key);

      return {
        count,
        expiresAt: now() + (ttl > 0 ? ttl : ttlSeconds) * 1000
      };
    }

    return this.memoryStore.incrementCounter(key, ttlSeconds, amount);
  }

  getStatus() {
    return {
      mode: this.redisEnabled ? "redis" : "memory",
      redisConfigured: Boolean(this.redisUrl),
      redisEnabled: this.redisEnabled
    };
  }
}
