import { describe, test, expect, beforeEach, mock } from "bun:test";
import { Hono } from "hono";
import { UrlController } from "../../controllers/url.controller";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const sampleUrlResponse = {
  shortUrl: "http://localhost:3000/abc1234",
  shortCode: "abc1234",
  originalUrl: "https://example.com",
  expiresAt: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

const sampleStatsResponse = {
  id: "01234567-0000-7000-8000-000000000000",
  shortCode: "abc1234",
  originalUrl: "https://example.com",
  clickCount: 42,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  expiresAt: null,
  lastAccessedAt: new Date("2024-01-20T10:00:00.000Z"),
};

// ---------------------------------------------------------------------------
// Helper: build a fresh Hono test app wired to the given controller
// ---------------------------------------------------------------------------
function buildApp(controller: UrlController): Hono {
  const app = new Hono();
  // Specific routes must be registered before the /:shortCode catch-all
  app.post("/shorten", controller.createShortUrl);
  app.post("/shorten/bulk", controller.createBulkUrls);
  app.get("/stats/:shortCode", controller.getUrlStats);
  app.get("/api/urls/top", controller.getTopUrls);
  app.get("/api/urls", controller.listUrls);
  app.post("/api/maintenance/cleanup", controller.cleanupExpiredUrls);
  // Catch-all last
  app.get("/:shortCode", controller.redirectToOriginalUrl);
  app.delete("/:shortCode", controller.deleteUrl);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("UrlController", () => {
  let mockService: any;
  let app: Hono;

  beforeEach(() => {
    mockService = {
      createShortUrl: mock(),
      createBulkUrls: mock(),
      getOriginalUrl: mock(),
      getUrlStats: mock(),
      deleteUrl: mock(),
      listUrls: mock(),
      getTopUrls: mock(),
      cleanupExpiredUrls: mock(),
    };

    const controller = new UrlController(mockService);
    app = buildApp(controller);
  });

  // ── POST /shorten ────────────────────────────────────────────────────────
  describe("POST /shorten", () => {
    test("returns 201 and the short URL on success", async () => {
      mockService.createShortUrl.mockResolvedValue(sampleUrlResponse);

      const res = await app.request("/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com" }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.shortUrl).toBe("http://localhost:3000/abc1234");
      expect(body.shortCode).toBe("abc1234");
      expect(body.originalUrl).toBe("https://example.com");
    });

    test("calls the service with the parsed request body", async () => {
      mockService.createShortUrl.mockResolvedValue(sampleUrlResponse);

      await app.request("/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com", customCode: "gh" }),
      });

      expect(mockService.createShortUrl).toHaveBeenCalledWith({
        url: "https://example.com",
        customCode: "gh",
      });
    });

    test("returns 409 when the service throws an 'already exists' error", async () => {
      mockService.createShortUrl.mockRejectedValue(new Error("Custom Code already exists"));

      const res = await app.request("/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com", customCode: "taken" }),
      });

      expect(res.status).toBe(409);
      const body: any = await res.json();
      expect(body.error).toContain("already exists");
    });

    test("returns 400 when the service throws an 'Invalid' error", async () => {
      mockService.createShortUrl.mockRejectedValue(new Error("Invalid URL format"));

      const res = await app.request("/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "not-a-url" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid");
    });
  });

  // ── POST /shorten/bulk ───────────────────────────────────────────────────
  describe("POST /shorten/bulk", () => {
    test("returns 201 with count and URL list on success", async () => {
      const bulkResponse = {
        count: 2,
        urls: [sampleUrlResponse, { ...sampleUrlResponse, shortCode: "xyz7890" }],
      };
      mockService.createBulkUrls.mockResolvedValue(bulkResponse);

      const res = await app.request("/shorten/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: ["https://example.com/1", "https://example.com/2"],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.count).toBe(2);
      expect(body.urls).toHaveLength(2);
    });

    test("returns 400 when the service throws a 'Maximum' error", async () => {
      mockService.createBulkUrls.mockRejectedValue(new Error("Maximum 100 URLs per batch"));

      const res = await app.request("/shorten/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: Array(101).fill("https://example.com") }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Maximum");
    });
  });

  // ── GET /:shortCode (redirect) ───────────────────────────────────────────
  describe("GET /:shortCode", () => {
    test("responds with 301 and a Location header on success", async () => {
      mockService.getOriginalUrl.mockResolvedValue("https://example.com");

      const res = await app.request("/abc1234");

      expect(res.status).toBe(301);
      expect(res.headers.get("Location")).toBe("https://example.com");
    });

    test("calls the service with the correct short code", async () => {
      mockService.getOriginalUrl.mockResolvedValue("https://example.com");

      await app.request("/abc1234");

      expect(mockService.getOriginalUrl).toHaveBeenCalledWith("abc1234");
    });

    test("returns 404 when the service throws a 'not found' error", async () => {
      mockService.getOriginalUrl.mockRejectedValue(new Error("URL not found or expired"));

      const res = await app.request("/doesnotexist");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain("not found");
    });
  });

  // ── GET /stats/:shortCode ────────────────────────────────────────────────
  describe("GET /stats/:shortCode", () => {
    test("returns 200 with URL statistics on success", async () => {
      mockService.getUrlStats.mockResolvedValue(sampleStatsResponse);

      const res = await app.request("/stats/abc1234");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.shortCode).toBe("abc1234");
      expect(body.clickCount).toBe(42);
    });

    test("returns 404 when the service throws a 'not found' error", async () => {
      mockService.getUrlStats.mockRejectedValue(new Error("URL not found"));

      const res = await app.request("/stats/notexist");

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /:shortCode ───────────────────────────────────────────────────
  describe("DELETE /:shortCode", () => {
    test("returns 200 with a success message", async () => {
      mockService.deleteUrl.mockResolvedValue(undefined);

      const res = await app.request("/abc1234", { method: "DELETE" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toContain("deleted");
    });

    test("returns 404 when the service throws a 'not found' error", async () => {
      mockService.deleteUrl.mockRejectedValue(new Error("URL not found"));

      const res = await app.request("/notexist", { method: "DELETE" });

      expect(res.status).toBe(404);
    });

    test("calls the service with the correct short code", async () => {
      mockService.deleteUrl.mockResolvedValue(undefined);

      await app.request("/abc1234", { method: "DELETE" });

      expect(mockService.deleteUrl).toHaveBeenCalledWith("abc1234");
    });
  });

  // ── GET /api/urls ────────────────────────────────────────────────────────
  describe("GET /api/urls", () => {
    test("returns 200 with paginated data", async () => {
      const paginatedResponse = {
        data: [sampleStatsResponse],
        total: 1,
        perPage: 10,
        currentPage: 1,
        maxPages: 1,
      };
      mockService.listUrls.mockResolvedValue(paginatedResponse);

      const res = await app.request("/api/urls");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.total).toBe(1);
      expect(body.data).toHaveLength(1);
    });

    test("passes limit and offset query parameters to the service", async () => {
      mockService.listUrls.mockResolvedValue({
        data: [],
        total: 0,
        perPage: 5,
        currentPage: 3,
        maxPages: 10,
      });

      await app.request("/api/urls?limit=5&offset=10");

      expect(mockService.listUrls).toHaveBeenCalledWith(5, 10);
    });

    test("falls back to limit=10, offset=0 when query params are absent", async () => {
      mockService.listUrls.mockResolvedValue({
        data: [],
        total: 0,
        perPage: 10,
        currentPage: 1,
        maxPages: 1,
      });

      await app.request("/api/urls");

      expect(mockService.listUrls).toHaveBeenCalledWith(10, 0);
    });
  });

  // ── GET /api/urls/top ────────────────────────────────────────────────────
  describe("GET /api/urls/top", () => {
    test("returns 200 with a 'urls' array", async () => {
      const topUrls = [{ ...sampleStatsResponse, clickCount: 999 }];
      mockService.getTopUrls.mockResolvedValue(topUrls);

      const res = await app.request("/api/urls/top?limit=5");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.urls).toHaveLength(1);
      expect(body.urls[0].clickCount).toBe(999);
    });

    test("passes the limit query parameter to the service", async () => {
      mockService.getTopUrls.mockResolvedValue([]);

      await app.request("/api/urls/top?limit=3");

      expect(mockService.getTopUrls).toHaveBeenCalledWith(3);
    });

    test("defaults to limit=10 when query param is absent", async () => {
      mockService.getTopUrls.mockResolvedValue([]);

      await app.request("/api/urls/top");

      expect(mockService.getTopUrls).toHaveBeenCalledWith(10);
    });
  });

  // ── POST /api/maintenance/cleanup ────────────────────────────────────────
  describe("POST /api/maintenance/cleanup", () => {
    test("returns 200 with deletedCount on success", async () => {
      mockService.cleanupExpiredUrls.mockResolvedValue(42);

      const res = await app.request("/api/maintenance/cleanup", {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Cleanup completed");
      expect(body.deletedCount).toBe(42);
    });

    test("returns deletedCount of 0 when nothing was cleaned up", async () => {
      mockService.cleanupExpiredUrls.mockResolvedValue(0);

      const res = await app.request("/api/maintenance/cleanup", {
        method: "POST",
      });

      const body = await res.json();
      expect(body.deletedCount).toBe(0);
    });
  });
});
