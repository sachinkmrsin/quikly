import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";
import { timingMiddleware } from "./middlewares/timing.middleware";
const app = new Hono();
import { prisma } from "./libs/prisma";
import { redis } from "./libs/redis";
import { UrlRepository } from "./repositories/url.repository";
import { UrlService } from "./services/url.service";
import { CacheService } from "./services/cache.service";
import { UrlController } from "./controllers/url.controller";
import { createUrlRoutes } from "./routes/url.routes";
import { errorHandler } from "./middlewares/error.middleware";
import { logger } from "./utils/logger.util";
import { config } from "./config";
const PORT = process.env.PORT || 5000;
app.use("*", honoLogger());
app.use("*", cors());
app.use("*", timingMiddleware);

app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connectec",
      redis: "connected",
      bun: Bun.version,
    });
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown Error",
      },
      503,
    );
  }
});

const urlRepository = new UrlRepository();
const cacheService = new CacheService();
const urlService = new UrlService(urlRepository, cacheService);
const urlController = new UrlController(urlService);

const urlRoutes = createUrlRoutes(urlController);
app.route("/", urlRoutes);
app.onError(errorHandler);
app.notFound((c) => c.json({ error: "Not Fount" }, 404));

async function start() {
  try {
    await redis.connect();
    logger.info("Redis Connect");

    await prisma.$connect();
    logger.info("Database connnected");
    logger.info(`Runnin on Bun ${Bun.version}`);
    logger.info(`Server running on port ${config.PORT}`);

    Bun.serve({
      port: config.PORT,
      fetch: app.fetch,
    });
  } catch (error) {
    logger.error("Startup error", error);
    process.exit(1);
  }
}

start();

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
});
