import { prisma } from "../libs/prisma";
import type { Url } from "../../generated/prisma/client";
export interface CreateUrlData {
  id: string;
  shortCode: string;
  originalUrl: string;
  expiresAt?: Date | null;
}

export interface UpdateUrlData {
  clickCount?: { increament: number };
  lastAccessedAt?: Date;
}
export class UrlRepository {
  async create(data: CreateUrlData): Promise<Url> {
    return prisma.url.create({ data });
  }

  async createMany(data: CreateUrlData[]): Promise<{ count: number }> {
    return prisma.url.createMany({
      data,
      skipDuplicates: true,
    });
  }
  async findByShortCode(shortCode: string): Promise<Url | void> {
    return prisma.url.findUnique({
      where: {
        shortCode,
      },
    });
  }
  async findByShortCodeNotExpired(shortCode: string): Promise<Url | void> {
    return prisma.url.findUnique({
      where: {
        shortCode,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  async incrementClickCount(shortCode: string): Promise<void> {
    await prisma.url.update({
      where: { shortCode },
      data: {
        clickCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });
  }

  async delete(shortCode: string): Promise<Url> {
    return prisma.url.delete({
      where: { shortCode },
    });
  }

  async findMany(params: {
    limit: number;
    offset: number;
    orderBy?: any;
    where?: any;
  }): Promise<Url[]> {
    return prisma.url.findMany({
      take: params.limit,
      skip: params.offset,
      orderBy: params.orderBy || { createdAt: "desc" },
      where: params.where,
    });
  }

  async count(where?: any): Promise<number> {
    return prisma.url.count({ where });
  }

  async deleteExpired(): Promise<{ count: number }> {
    return prisma.url.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
