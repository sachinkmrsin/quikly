import type { Context, Next } from "hono";

import { config } from "@/config";
import { redis } from "@/libs/redis";
import { logger } from "@/utils/logger.util";

const { CAPACITY, REFILL_RATE, WINDOW_SEC } = config.RATE_LIMIT;

/**
 * Token Bucket Rate Limiter (per IP, backed by Redis)
 *
 * Each IP gets a bucket of `CAPACITY` tokens.
 * Tokens refill at `REFILL_RATE` tokens/second up to the bucket capacity.
 * Every request consumes 1 token. When the bucket is empty → 429.
 *
 * Redis key  : `rate_limit:{ip}`
 * Redis type : Hash  { tokens: number, lastRefill: unix-ms }
 * TTL        : `WINDOW_SEC` seconds (resets on every successful request)
 *
 */
export const rateLimitMiddleware = async (c: Context, next: Next) => {
  const forwarded = c.req.header("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0]?.trim() : undefined) ??
    c.req.header("x-real-ip") ??
    "unknown";

  const key = `rate_limit:${ip}`;
  const now = Date.now();

  try {
    const [rawTokens, rawLastRefill] = await redis.hmGet(key, ["tokens", "lastRefill"]);

    let tokens: number;
    let lastRefill: number;

    if (rawTokens == null || rawLastRefill == null) {
      // First request from this IP — start with a full bucket
      tokens = CAPACITY;
      lastRefill = now;
    } else {
      tokens = parseFloat(rawTokens);
      lastRefill = parseInt(rawLastRefill, 10);
    }

    //Refill tokens based on elapsed time
    const elapsedSec = (now - lastRefill) / 1000;
    const refilled = elapsedSec * REFILL_RATE;
    tokens = Math.min(CAPACITY, tokens + refilled);

    //Set response headers
    c.header("X-RateLimit-Limit", String(CAPACITY));
    c.header("X-RateLimit-Remaining", String(Math.max(0, Math.floor(tokens - 1))));
    c.header(
      "X-RateLimit-Policy",
      `${CAPACITY};w=${WINDOW_SEC};burst=${CAPACITY};comment="token-bucket"`,
    );

    //Check and consume one token
    if (tokens < 1) {
      const retryAfterSec = Math.ceil((1 - tokens) / REFILL_RATE);
      c.header("Retry-After", String(retryAfterSec));
      c.header("X-RateLimit-Remaining", "0");

      logger.warn("Rate limit exceeded", { ip, tokens: tokens.toFixed(4) });

      return c.json(
        {
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again in ${retryAfterSec}s.`,
          retryAfter: retryAfterSec,
        },
        429,
      );
    }

    // Consume 1 token and persist the updated bucket
    tokens -= 1;

    await redis
      .multi()
      .hSet(key, { tokens: String(tokens), lastRefill: String(now) })
      .expire(key, WINDOW_SEC)
      .exec();

    await next();
  } catch (err) {
    logger.error("Rate limiter Redis error — failing open", {
      ip,
      error: err instanceof Error ? err.message : err,
    });
    await next();
  }
};
