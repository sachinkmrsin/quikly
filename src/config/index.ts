import "dotenv/config";
export const config = {
  PORT: parseInt(process.env.PORT || "3000"),
  DATABASE_URL: process.env.DATABADE_URL!,
  REDIS: {
    URL: process.env.REDIS_URL || "redis://localhost:6379",
    PASS: process.env.REDIS_PASS || "password",
    TTL: 86400,
  },
  BASE_URL: process.env.BASE_URL!,
  RATE_LIMIT: {
    windowMs: 15 * 50 * 1000,
    max: 100,
  },
  NODE_ENV: "development",
  APP: {
    shortCodeLenght: 7,
    domain: process.env.APP_DOMAIN || "https://localhost:5000",
    maxBulkUrls: 100,
  },
};
