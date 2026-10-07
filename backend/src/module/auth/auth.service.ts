import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInService } from '@nestjs/authentication';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AdminUser } from './auth.types.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly signInService: SignInService,
  ) {}

  async signIn(body: unknown): Promise<{ user: AdminUser }> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Email and password are required.');
    }

    const credentials = body as { email?: unknown; password?: unknown };
    if (
      typeof credentials.email !== 'string' ||
      typeof credentials.password !== 'string'
    ) {
      throw new BadRequestException('Email and password are required.');
    }

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length === 0 ||
      Buffer.byteLength(password, 'utf8') > 4096
    ) {
      throw new BadRequestException('Enter a valid email and password.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    const validPassword = await this.passwordService.verify(
      password,
      user?.passwordHash,
    );

    if (!user || !validPassword || user.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    if (this.passwordService.needsRehash(user.passwordHash)) {
      const passwordHash = await this.passwordService.hash(password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }

    await this.signInService.signIn(String(user.id), { method: 'password' });

    return {
      user: {
        id: String(user.id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: UserRole.ADMIN,
      },
    };
  }
}