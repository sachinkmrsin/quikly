import type { Context, Next } from "hono";

export const timingMiddleware = async (c: Context, next: Next) => {
  const start = performance.now();
  await next();
  const duration = performance.now() - start;
  c.res.headers.set("X-Response-Time", `${duration.toFixed(2)}ms`);
};
