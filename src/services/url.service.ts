import { randomUUIDv7 } from "bun";
import type { UrlRepository } from "../repositories/url.repository";
import type {
  BulkCreateUrlDto,
  BulkUrlResponse,
  CreateUrlDto,
  UrlResponse,
  UrlStatsResponse,
} from "../types/url.types";
import { Validation } from "../utils/validation.util";
import type { CacheService } from "./cache.service";
import { Base62Util } from "../utils/base62.util";
import { config } from "../config";
import type { PaginatedResopnse } from "../types/common.types";

export class UrlService {
  constructor(
    private urlRepository: UrlRepository,
    private cacheService: CacheService,
  ) {}

  async createShortUrl(dto: CreateUrlDto): Promise<UrlResponse> {
    const sanitizedUrl = Validation.sanitizedUrl(dto.url);
    if (!Validation.isValidUrl(sanitizedUrl)) {
      throw new Error("Invalid URL format");
    }
    const id = randomUUIDv7();
    const shortCode =
      dto.customeCode || Base62Util.toBase62(id, config.APP.shortCodeLenght);
    if (dto.customeCode && !Validation.isValidShortCode(dto.customeCode)) {
      throw new Error("Invalid custom code format");
    }

    const expiresAt = dto.expiresIn
      ? new Date(Date.now() + dto.expiresIn * 1000)
      : null;
    try {
      const urlRecord = await this.urlRepository.create({
        id,
        shortCode,
        originalUrl: sanitizedUrl,
        expiresAt,
      });
      await this.cacheService.set(shortCode, sanitizedUrl);
      return {
        shortUrl: `${config.APP.domain}/${shortCode}`,
        shortCode: urlRecord.shortCode,
        originalUrl: urlRecord.originalUrl,
        expiredsAt: urlRecord.expiresAt,
        createdAt: urlRecord.createdAt,
      };
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("Custome Code already exists");
      }
      throw error;
    }
  }

  async createBulkUrls(dto: BulkCreateUrlDto): Promise<BulkUrlResponse> {
    if (dto.urls.length > config.APP.maxBulkUrls) {
      throw new Error(`Maximum ${config.APP.maxBulkUrls} URLs per batch`);
    }
    const validUrls = dto.urls
      .map((url) => Validation.sanitizedUrl(url))
      .filter((url) => Validation.isValidUrl(url));
    if (validUrls.length === 0) {
      throw new Error("No valid Urls Provided");
    }

    const records = validUrls.map((url) => {
      const id = randomUUIDv7();
      const shortCode = Base62Util.toBase62(id, config.APP.shortCodeLenght);
      return { id, shortCode, originalUrl: url };
    });

    await this.urlRepository.createMany(records);
    await this.cacheService.setMany(
      records.map((r) => ({
        shortCode: r.shortCode,
        originalUrl: r.originalUrl,
      })),
    );
    return {
      count: records.length,
      urls: records.map((r) => ({
        shortUrl: `${config.APP.domain}/${r.shortCode}`,
        shortCode: r.shortCode,
        originalUrl: r.originalUrl,
        expiredsAt: null,
        createdAt: new Date(),
      })),
    };
  }

  async getOriginalUrl(shortCode: string): Promise<string> {
    let originalUrl = await this.cacheService.get(shortCode);
    if (originalUrl) {
      this.urlRepository.incrementClickCount(shortCode).catch((error) => {
        console.error("Background Update Error", error);
      });
      return originalUrl;
    }
    const urlRecord =
      await this.urlRepository.findByShortCodeNotExpired(shortCode);
    if (!urlRecord) {
      throw new Error("URL not found or expired");
    }
    await this.urlRepository.incrementClickCount(shortCode);

    originalUrl = urlRecord.originalUrl;
    this.cacheService.set(shortCode, originalUrl);
    return originalUrl;
  }

  async getUrlStats(shortCode: string): Promise<UrlStatsResponse> {
    const urlRecord = await this.urlRepository.findByShortCode(shortCode);
    if (!urlRecord) {
      throw new Error("URL not found");
    }
    return urlRecord;
  }

  async deleteUrl(shortCode: string): Promise<void> {
    await this.urlRepository.delete(shortCode);
    await this.cacheService.delete(shortCode);
  }
  async listUrls(
    limit: number,
    offset: number,
  ): Promise<PaginatedResopnse<UrlStatsResponse>> {
    const [urls, total] = await Promise.all([
      this.urlRepository.findMany({ limit, offset }),
      this.urlRepository.count(),
    ]);
    return {
      data: urls,
      total,
      perPage: limit,
      currentPage: Math.floor(offset / limit) + 1,
      maxPages: Math.ceil(total / limit),
    };
  }

  async getTopUrls(limit: number): Promise<UrlStatsResponse[]> {
    return this.urlRepository.findMany({
      limit,
      offset: 0,
      orderBy: { clickCount: "desc" },
    });
  }
  async cleanupExpiredUrls(): Promise<number> {
    const result = await this.urlRepository.deleteExpired();
    return result.count;
  }
}
