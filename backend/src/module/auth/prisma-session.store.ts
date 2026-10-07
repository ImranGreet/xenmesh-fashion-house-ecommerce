import { Injectable } from '@nestjs/common';
import { AuthenticationStorage } from '@nestjs/authentication';
import type {
  SessionRecord,
  SessionStore,
} from '@nestjs/authentication';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class PrismaSessionStore implements SessionStore {
  constructor(
    private readonly prisma: PrismaService,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ sessions: this });
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const record = await this.prisma.authSession.findUnique({ where: { id } });
    return record ? this.toSessionRecord(record) : undefined;
  }

  async createSession(record: SessionRecord): Promise<void> {
    const metadata =
      record.metadata === undefined
        ? undefined
        : (JSON.parse(
            JSON.stringify(record.metadata),
          ) as Prisma.InputJsonObject);

    await this.prisma.authSession.create({
      data: {
        id: record.id,
        userId: Number(record.userId),
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        lastActiveAt: record.lastActiveAt,
        mfa: record.mfa,
        metadata,
      },
    });
  }

  async touchSession(id: string, lastActiveAt: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id, lastActiveAt: { lt: lastActiveAt } },
      data: { lastActiveAt },
    });
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await this.prisma.authSession.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    const records = await this.prisma.authSession.findMany({
      where: { userId: Number(userId) },
    });
    return records.map((record) => this.toSessionRecord(record));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.prisma.authSession.deleteMany({
      where: { userId: Number(userId) },
    });
  }

  private toSessionRecord(
    record: Awaited<ReturnType<PrismaService['authSession']['findUnique']>>,
  ): SessionRecord {
    if (!record) {
      throw new Error('Cannot map a missing authentication session.');
    }

    const metadata = record.metadata;
    return {
      id: record.id,
      userId: String(record.userId),
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      lastActiveAt: record.lastActiveAt,
      ...(record.mfa === 'pending' || record.mfa === 'verified'
        ? { mfa: record.mfa }
        : {}),
      ...(metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? { metadata }
        : {}),
    };
  }
}
