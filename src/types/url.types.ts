export interface CreateUrlDto {
  url: string;
  customeCode?: string;
  expiresIn?: number;
}

export interface BulkCreateDto {
  urls: string[];
}

export interface UrlResponse {
  shortUrl: string;
  shortCode: string;
  originalUrl: string;
  expiredsAt: Date | null;
  createdAt: Date;
}

export interface UrlStatsResponse {
  id: string;
  shortCode: string;
  originalUrl: string;
  clickCount: number;
  createdAt: Date;
  expiresAt: Date | null;
  lastAccessedAt: Date | null;
}

export interface BulkUrlResponse {
  count: number;
  urls: UrlResponse[];
}
