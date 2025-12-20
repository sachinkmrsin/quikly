import { config } from "../config";
import { redis } from "../libs/redis";
import { logger } from "../utils/logger.util";

export class CacheService {
  private readonly prefix = "url:";
  private readonly ttl = config.REDIS.TTL;

  async get(shortCode: string): Promise<string | null> {
    try {
      const key = this.prefix + shortCode;
      return await redis.get(key);
    } catch (error) {
      logger.error(`Cache GET Error`, { shortCode, error });
      return null;
    }
  }

  async set(shortCode: string, originalUrl: string): Promise<void> {
    try {
      const key = this.prefix + shortCode;
      await redis.setEx(shortCode, this.ttl, originalUrl);
    } catch (error) {
      logger.error(`Cache SET error`, { shortCode, error });
    }
  }

  async delete(shortCode: string): Promise<void> {
    try {
      const key = this.prefix + shortCode;
      await redis.del(key);
    } catch (error) {
      logger.error("Cache DEL Error", { shortCode, error });
    }
  }
}
