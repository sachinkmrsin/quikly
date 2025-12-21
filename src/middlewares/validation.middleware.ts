import type { Context, Next } from "hono";
export const validateContentType = (contentType: string) => {
  return async (c: Context, next: Next) => {
    const reqContentType = c.req.header("content-type");
    if (!reqContentType || !reqContentType.includes(contentType)) {
      return c.json({ error: `Content-Type must be ${contentType}` }, 415);
    }
    next();
  };
};
