import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  SessionCookieProvider,
} from '@nestjs/authentication';
import type { SessionRecord } from '@nestjs/authentication';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AdminUser } from './auth.types.js';

@Injectable()
export class AdminSessionProvider extends SessionCookieProvider<AdminUser> {
  constructor(
    private readonly prisma: PrismaService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  protected async validate(
    session: SessionRecord,
  ): Promise<AdminUser | null> {
    if (!/^\d+$/.test(session.userId)) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: Number(session.userId) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      return null;
    }

    return {
      id: String(user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: UserRole.ADMIN,
    };
  }
}
