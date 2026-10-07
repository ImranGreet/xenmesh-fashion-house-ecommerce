import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email && !password) {
      this.logger.warn(
        'Admin bootstrap skipped; configure ADMIN_EMAIL and ADMIN_PASSWORD to create the initial admin account.',
      );
      return;
    }
    if (!email || !password) {
      throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD.');
    }
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      Buffer.byteLength(password, 'utf8') < 12 ||
      Buffer.byteLength(password, 'utf8') > 4096
    ) {
      throw new Error(
        'ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be 12-4096 bytes.',
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== UserRole.ADMIN) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: UserRole.ADMIN },
        });
        this.logger.log(`Promoted configured admin account ${email}.`);
      }
      return;
    }

    const passwordHash = await this.passwordService.hash(password);
    await this.prisma.user.create({
      data: { email, passwordHash, role: UserRole.ADMIN },
    });
    this.logger.log(`Created initial admin account ${email}.`);
  }
}
