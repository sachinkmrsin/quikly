import { Hono } from "hono";
import type { UrlController } from "../controllers/url.controller";
import { validateContentType } from "../middlewares/validation.middleware";

export function createUrlRoutes(urlController: UrlController) {
  const routes = new Hono();
  routes.post(
    "/shorten",
    validateContentType("application/json"),
    urlController.createShortUrl,
  );

  routes.post(
    "/shorten/bulk",
    validateContentType("application/json"),
    urlController.createBulkUrls,
  );

  routes.get("/:shortCode", urlController.redirectToOriginalUrl);

  routes.get("/stats/:shortCode", urlController.getUrlStats);
  routes.delete("/:shortCode", urlController.deleteUrl);

  routes.get("/api/urls", urlController.listUrls);
  routes.get("/api/urls/top", urlController.getTopUrls);
  routes.post("/api/maintenance/cleanup", urlController.cleanupExpiredUrls);
  return routes;
}
