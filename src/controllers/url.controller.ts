import type { Context } from "hono";
import { UrlService } from "../services/url.service";

import type { CreateUrlDto, BulkCreateUrlDto } from "../types/url.types";

export class UrlController {
  constructor(private urlService: UrlService) {}

  createShortUrl = async (c: Context) => {
    try {
      const dto: CreateUrlDto = await c.req.json();
      const result = await this.urlService.createShortUrl(dto);
      return c.json(result, 201);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          return c.json({ error: error.message }, 409);
        }
        if (error.message.includes("Invalid")) {
          return c.json({ error: error.message }, 400);
        }
      }
      throw error;
    }
  };
  createBulkUrls = async (c: Context) => {
    try {
      const dto: BulkCreateUrlDto = await c.req.json();
      const result = await this.urlService.createBulkUrls(dto);
      return c.json(result, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Maximum")) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  };

  redirectToOriginalUrl = async (c: Context) => {
    try {
      const shortCode = c.req.param("shortCode");
      const originalUrl = await this.urlService.getOriginalUrl(shortCode);
      return c.redirect(originalUrl, 301);
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("not found")) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  };

  getUrlStats = async (c: Context) => {
    try {
      const shortCode = c.req.param("shortCode");
      const stats = await this.urlService.getUrlStats(shortCode);
      return c.json(stats);
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("not found")) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  };

  deleteUrl = async (c: Context) => {
    try {
      const shortCode = c.req.param("shortCode");
      await this.urlService.deleteUrl(shortCode);
      return c.json({ message: "URL deleted Successfully" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  };
  listUrls = async (c: Context) => {
    try {
      const limit = parseInt(c.req.query("limit") || "10");
      const offset = parseInt(c.req.query("offset") || "0");
      const result = await this.urlService.listUrls(limit, offset);
      return c.json(result);
    } catch (error) {
      throw error;
    }
  };

  getTopUrls = async (c: Context) => {
    try {
      const limit = parseInt(c.req.query("limit") || "10");
      const urls = await this.urlService.getTopUrls(limit);
      return c.json({ urls });
    } catch (error) {
      throw error;
    }
  };

  cleanupExpiredUrls = async (c: Context) => {
    try {
      const count = await this.urlService.cleanupExpiredUrls();
      return c.json({ message: "Cleanup completed", deletedCount: count });
    } catch (error) {
      throw error;
    }
  };
}
