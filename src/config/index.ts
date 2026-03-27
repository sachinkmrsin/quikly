import "dotenv/config";

  function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === "") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  function intEnv(name: string, fallback?: number): number {
    const raw = process.env[name];
    if (raw == null || raw === "") {
      if (fallback !== undefined) return fallback;
      throw new Error(`Missing required numeric environment variable: ${name}`);
    }

    const num = Number(raw);
    if (!Number.isInteger(num)) {
      throw new Error(`Invalid integer for ${name}: "${raw}"`);
    }
    return num;
  }

  export const config = {
    PORT: intEnv("PORT", 3000),
    DATABASE_URL: requireEnv("DATABASE_URL"), // required
    REDIS: {
      URL: process.env.REDIS_URL ?? "redis://localhost:6379",
      PASS: process.env.REDIS_PASS ?? "password",
      TTL: 86400,
    },
    BASE_URL: requireEnv("BASE_URL"), // required
    RATE_LIMIT: {
      CAPACITY: intEnv("RATE_LIMIT_CAPACITY", 100),
      REFILL_RATE: intEnv("RATE_LIMIT_REFILL_RATE", 10),
      WINDOW_SEC: intEnv("RATE_LIMIT_WINDOW_SEC", 3600),
    },
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP: {
      shortCodeLength: 7,
      domain: process.env.APP_DOMAIN ?? "https://localhost:5000",
      maxBulkUrls: 100,
    },
  } as const;