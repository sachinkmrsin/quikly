import { createClient } from "redis";

import { config } from "../config";
import { logger } from "../utils/logger.util";

export type RedisClient = ReturnType<typeof createClient>;

const redisClientSingleton = () => {
  const client = createClient({
    url: config.REDIS.URL,
    password: config.REDIS.PASS,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error("Redis max reconnection attempts reached");
          return new Error("Max reconnection attempts reached");
        }
        return Math.min(retries * 50, 500);
      },
    },
  });
  client.on("error", (err) => logger.error("Redis Client Error", err));
  client.on("connect", () => logger.info("Redis Client Connected"));
  client.on("reconnecting", () => logger.warn("Redis Client Reconnecting"));

  return client;
};

declare global {
  var redis: undefined | RedisClient;
}

export const redis = globalThis.redis ?? redisClientSingleton();
if (config.NODE_ENV !== "production") {
  globalThis.redis = redis;
}
