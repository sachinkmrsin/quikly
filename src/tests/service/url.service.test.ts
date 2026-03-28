import { describe, test, expect, beforeEach, mock } from "bun:test";
import { UrlService } from "../../services/url.service";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const sampleRecord = {
  id: "01234567-0000-7000-8000-000000000000",
  shortCode: "abc1234",
  originalUrl: "https://example.com",
  expiresAt: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  clickCount: 0,
  lastAccessedAt: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("UrlService", () => {
  let mockRepository: any;
  let mockCacheService: any;
  let urlService: UrlService;

  beforeEach(() => {
    mockRepository = {
      create: mock(),
      createMany: mock(),
      findByShortCode: mock(),
      findByShortCodeNotExpired: mock(),
      incrementClickCount: mock(),
      delete: mock(),
      findMany: mock(),
      count: mock(),
      deleteExpired: mock(),
    };

    mockCacheService = {
      get: mock(),
      set: mock(),
      delete: mock(),
      setMany: mock(),
    };

    urlService = new UrlService(mockRepository, mockCacheService);
  });

  // ── createShortUrl ──────────────────────────────────────────────────────
  describe("createShortUrl", () => {
    test("returns a UrlResponse on success", async () => {
      mockRepository.create.mockResolvedValue(sampleRecord);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await urlService.createShortUrl({
        url: "https://example.com",
      });

      expect(result.originalUrl).toBe("https://example.com");
      expect(result.shortCode).toBe("abc1234");
      expect(result.shortUrl).toStartWith("http://localhost:3000/");
      expect(result.expiresAt).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    test("calls repository.create and cacheService.set once", async () => {
      mockRepository.create.mockResolvedValue(sampleRecord);
      mockCacheService.set.mockResolvedValue(undefined);

      await urlService.createShortUrl({ url: "https://example.com" });

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockCacheService.set).toHaveBeenCalledTimes(1);
    });

    test("throws 'Invalid URL format' for a non-URL string", async () => {
      await expect(urlService.createShortUrl({ url: "not-a-valid-url" })).rejects.toThrow(
        "Invalid URL format",
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    test("trims whitespace from the URL before storing", async () => {
      mockRepository.create.mockResolvedValue(sampleRecord);
      mockCacheService.set.mockResolvedValue(undefined);

      await urlService.createShortUrl({ url: "  https://example.com  " });

      const createArg = mockRepository.create.mock.calls[0]?.[0];
      expect(createArg?.originalUrl).toBe("https://example.com");
    });

    test("uses customCode when provided and valid", async () => {
      const customRecord = { ...sampleRecord, shortCode: "mylink" };
      mockRepository.create.mockResolvedValue(customRecord);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await urlService.createShortUrl({
        url: "https://example.com",
        customCode: "mylink",
      });

      const createArg = mockRepository.create.mock.calls[0]?.[0];
      expect(createArg?.shortCode).toBe("mylink");
      expect(result.shortCode).toBe("mylink");
    });

    test("throws 'Invalid custom code format' when customCode has invalid chars", async () => {
      await expect(
        urlService.createShortUrl({
          url: "https://example.com",
          customCode: "bad code!",
        }),
      ).rejects.toThrow("Invalid custom code format");

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    test("sets expiresAt when expiresIn (seconds) is provided", async () => {
      const expiryRecord = {
        ...sampleRecord,
        expiresAt: new Date(Date.now() + 3_600_000),
      };
      mockRepository.create.mockResolvedValue(expiryRecord);
      mockCacheService.set.mockResolvedValue(undefined);

      const before = Date.now();
      await urlService.createShortUrl({
        url: "https://example.com",
        expiresIn: 3600,
      });
      const after = Date.now();

      const createArg = mockRepository.create.mock.calls[0]?.[0];
      const expiresAt: Date = createArg?.expiresAt;

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3_599_000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 3_601_000);
    });

    test("does not set expiresAt when expiresIn is absent", async () => {
      mockRepository.create.mockResolvedValue(sampleRecord);
      mockCacheService.set.mockResolvedValue(undefined);

      await urlService.createShortUrl({ url: "https://example.com" });

      const createArg = mockRepository.create.mock.calls[0]?.[0];
      expect(createArg?.expiresAt).toBeNull();
    });

    test("throws 'already exists' error on Prisma P2002 unique-constraint violation", async () => {
      const prismaError = Object.assign(new Error("Unique constraint"), {
        code: "P2002",
      });
      mockRepository.create.mockRejectedValue(prismaError);

      await expect(
        urlService.createShortUrl({
          url: "https://example.com",
          customCode: "taken",
        }),
      ).rejects.toThrow("Custom Code already exists");
    });

    test("re-throws unknown repository errors", async () => {
      mockRepository.create.mockRejectedValue(new Error("Database down"));

      await expect(urlService.createShortUrl({ url: "https://example.com" })).rejects.toThrow(
        "Database down",
      );
    });
  });

  // ── createBulkUrls ──────────────────────────────────────────────────────
  describe("createBulkUrls", () => {
    test("returns count and URL list on success", async () => {
      mockRepository.createMany.mockResolvedValue({ count: 2 });
      mockCacheService.setMany.mockResolvedValue(undefined);

      const result = await urlService.createBulkUrls({
        urls: ["https://example.com/1", "https://example.com/2"],
      });

      expect(result.count).toBe(2);
      expect(result.urls).toHaveLength(2);
      expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
      expect(mockCacheService.setMany).toHaveBeenCalledTimes(1);
    });

    test("each BulkUrlResponse entry contains required fields", async () => {
      mockRepository.createMany.mockResolvedValue({ count: 1 });
      mockCacheService.setMany.mockResolvedValue(undefined);

      const result = await urlService.createBulkUrls({
        urls: ["https://example.com/page"],
      });

      const entry = result.urls[0]!;
      expect(entry.originalUrl).toBe("https://example.com/page");
      expect(entry.shortCode).toBeTruthy();
      expect(entry.shortUrl).toContain(entry.shortCode);
    });

    test("throws when URL count exceeds maxBulkUrls (100)", async () => {
      const tooMany = Array.from({ length: 101 }, (_, i) => `https://example.com/${i}`);

      await expect(urlService.createBulkUrls({ urls: tooMany })).rejects.toThrow(
        "Maximum 100 URLs per batch",
      );
    });

    test("throws when no valid URLs are in the batch", async () => {
      await expect(
        urlService.createBulkUrls({ urls: ["not-valid", "also://bad url"] }),
      ).rejects.toThrow("No valid Urls Provided");
    });

    test("filters out invalid URLs and processes only valid ones", async () => {
      mockRepository.createMany.mockResolvedValue({ count: 1 });
      mockCacheService.setMany.mockResolvedValue(undefined);

      const result = await urlService.createBulkUrls({
        urls: ["https://valid.com", "not-a-url", "ftp://also-valid.net"],
      });

      // "not-a-url" is filtered; 2 valid URLs remain
      expect(result.count).toBe(2);
    });
  });

  // ── getOriginalUrl ──────────────────────────────────────────────────────
  describe("getOriginalUrl", () => {
    test("returns URL from cache on cache hit without querying DB", async () => {
      mockCacheService.get.mockResolvedValue("https://example.com");
      mockRepository.incrementClickCount.mockResolvedValue(undefined);

      const result = await urlService.getOriginalUrl("abc1234");

      expect(result).toBe("https://example.com");
      expect(mockCacheService.get).toHaveBeenCalledWith("abc1234");
      expect(mockRepository.findByShortCodeNotExpired).not.toHaveBeenCalled();
    });

    test("increments click count asynchronously on cache hit", async () => {
      mockCacheService.get.mockResolvedValue("https://example.com");
      mockRepository.incrementClickCount.mockResolvedValue(undefined);

      await urlService.getOriginalUrl("abc1234");
      // allow the fire-and-forget microtask to settle
      await new Promise((r) => setTimeout(r, 20));

      expect(mockRepository.incrementClickCount).toHaveBeenCalledWith("abc1234");
    });

    test("falls through to DB on cache miss and returns URL", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findByShortCodeNotExpired.mockResolvedValue(sampleRecord);
      mockRepository.incrementClickCount.mockResolvedValue(undefined);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await urlService.getOriginalUrl("abc1234");

      expect(result).toBe("https://example.com");
      expect(mockRepository.findByShortCodeNotExpired).toHaveBeenCalledWith("abc1234");
    });

    test("caches the URL retrieved from DB", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findByShortCodeNotExpired.mockResolvedValue(sampleRecord);
      mockRepository.incrementClickCount.mockResolvedValue(undefined);
      mockCacheService.set.mockResolvedValue(undefined);

      await urlService.getOriginalUrl("abc1234");

      expect(mockCacheService.set).toHaveBeenCalledWith("abc1234", "https://example.com");
    });

    test("throws 'URL not found or expired' when not in cache or DB", async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findByShortCodeNotExpired.mockResolvedValue(null);

      await expect(urlService.getOriginalUrl("notexist")).rejects.toThrow(
        "URL not found or expired",
      );
    });
  });

  // ── getUrlStats ─────────────────────────────────────────────────────────
  describe("getUrlStats", () => {
    test("returns the full URL record", async () => {
      mockRepository.findByShortCode.mockResolvedValue(sampleRecord);

      const result = await urlService.getUrlStats("abc1234");

      expect(result).toEqual(sampleRecord);
      expect(mockRepository.findByShortCode).toHaveBeenCalledWith("abc1234");
    });

    test("throws 'URL not found' when short code doesn't exist", async () => {
      mockRepository.findByShortCode.mockResolvedValue(null);

      await expect(urlService.getUrlStats("notexist")).rejects.toThrow("URL not found");
    });
  });

  // ── deleteUrl ───────────────────────────────────────────────────────────
  describe("deleteUrl", () => {
    test("deletes the URL from the DB and the cache", async () => {
      mockRepository.delete.mockResolvedValue(sampleRecord);
      mockCacheService.delete.mockResolvedValue(undefined);

      await urlService.deleteUrl("abc1234");

      expect(mockRepository.delete).toHaveBeenCalledWith("abc1234");
      expect(mockCacheService.delete).toHaveBeenCalledWith("abc1234");
    });
  });

  // ── listUrls ─────────────────────────────────────────────────────────────
  describe("listUrls", () => {
    test("returns a paginated response with data and totals", async () => {
      const page = [sampleRecord, { ...sampleRecord, id: "2", shortCode: "xyz7890" }];
      mockRepository.findMany.mockResolvedValue(page);
      mockRepository.count.mockResolvedValue(2);

      const result = await urlService.listUrls(10, 0);

      expect(result.data).toEqual(page);
      expect(result.total).toBe(2);
      expect(result.perPage).toBe(10);
      expect(result.currentPage).toBe(1);
      expect(result.maxPages).toBe(1);
    });

    test("calculates currentPage and maxPages correctly from offset", async () => {
      mockRepository.findMany.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(50);

      const result = await urlService.listUrls(10, 20);

      expect(result.currentPage).toBe(3);
      expect(result.maxPages).toBe(5);
    });
  });

  // ── getTopUrls ──────────────────────────────────────────────────────────
  describe("getTopUrls", () => {
    test("queries by clickCount desc and returns result", async () => {
      const topUrls = [
        { ...sampleRecord, clickCount: 1000 },
        { ...sampleRecord, id: "2", clickCount: 500 },
      ];
      mockRepository.findMany.mockResolvedValue(topUrls);

      const result = await urlService.getTopUrls(5);

      expect(result).toEqual(topUrls);
      const args = mockRepository.findMany.mock.calls[0]?.[0];
      expect(args?.limit).toBe(5);
      expect(args?.orderBy).toEqual({ clickCount: "desc" });
    });
  });

  // ── cleanupExpiredUrls ──────────────────────────────────────────────────
  describe("cleanupExpiredUrls", () => {
    test("returns the count of deleted expired URLs", async () => {
      mockRepository.deleteExpired.mockResolvedValue({ count: 15 });

      const result = await urlService.cleanupExpiredUrls();

      expect(result).toBe(15);
      expect(mockRepository.deleteExpired).toHaveBeenCalledTimes(1);
    });

    test("returns 0 when no URLs have expired", async () => {
      mockRepository.deleteExpired.mockResolvedValue({ count: 0 });

      const result = await urlService.cleanupExpiredUrls();

      expect(result).toBe(0);
    });
  });
});
