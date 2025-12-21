import type { Context } from "hono";

import { logger } from "../utils/logger.util";

export const errorHandler = async (err: Error, c: Context) => {
  logger.error("Unhandled Error", { error: err.message, stack: err.stack });

  return c.json(
    {
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
};
