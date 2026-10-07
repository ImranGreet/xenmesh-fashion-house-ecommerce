import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  throw new Error(
    'Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env before seeding the admin.',
  );
}

const app = await NestFactory.createApplicationContext(AppModule);

try {
  console.log('Admin seed completed.');
} finally {
  await app.close();
}
