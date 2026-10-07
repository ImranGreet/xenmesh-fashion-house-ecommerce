import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@nestjs/authentication';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './module/auth/auth.module.js';

@Module({
  imports: [
    AuthenticationModule.forRoot({
      session: {
        trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
        metadata: (request) => ({
          ip: request.ip ?? '',
          userAgent: request.headers['user-agent']?.toString() ?? '',
        }),
      },
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}