import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';
import { AdminSessionProvider } from './admin-session.provider.js';
import { PasswordService } from './password.service.js';
import { PrismaSessionStore } from './prisma-session.store.js';

@Module({
  controllers: [AuthController],
  providers: [
    AdminBootstrapService,
    AdminSessionProvider,
    AuthService,
    PasswordService,
    PrismaSessionStore,
  ],
})
export class AuthModule {}