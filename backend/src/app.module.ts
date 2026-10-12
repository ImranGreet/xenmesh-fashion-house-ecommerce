import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@nestjs/authentication';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './module/auth/auth.module.js';
import { CatalogModule } from './module/catalog/catalog.module.js';
import { OrdersModule } from './module/orders/orders.module.js';
import { SettingsModule } from './module/settings/settings.module.js';

@Module({
  imports: [
    AuthenticationModule.forRoot({
      session: {
        trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
        metadata: (request) => ({
          ip: request.ip ?? '',
          userAgent: request.headers['user-agent']?.toString() ?? '',
        }),
      },
    }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    OrdersModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}