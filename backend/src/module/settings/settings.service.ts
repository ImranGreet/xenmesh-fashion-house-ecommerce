import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

const defaultSettings = {
  id: 'store',
  storeName: 'Xenmesh Fashion House',
  contactEmail: 'xen@gmail.com',
  phone: '01912444216',
  location: 'Dhaka, Bangladesh',
};

function parseSettings(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object.');
  }
  const data = value as Record<string, unknown>;
  const fields = {
    storeName: { label: 'Store name', max: 160 },
    contactEmail: { label: 'Contact email', max: 254 },
    phone: { label: 'Phone number', max: 32 },
    location: { label: 'Store location', max: 160 },
  } as const;
  const result: Record<string, string> = {};
  for (const [key, field] of Object.entries(fields)) {
    const entry = data[key];
    if (
      typeof entry !== 'string' ||
      entry.trim().length === 0 ||
      entry.trim().length > field.max
    ) {
      throw new BadRequestException(`${field.label} is required (max ${field.max} characters).`);
    }
    result[key] = entry.trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.contactEmail)) {
    throw new BadRequestException('Enter a valid contact email.');
  }
  if (result.phone.replace(/\D/g, '').length < 7) {
    throw new BadRequestException('Enter a valid phone number.');
  }
  return result as Omit<typeof defaultSettings, 'id'>;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.storeSettings.upsert({
      where: { id: 'store' },
      create: defaultSettings,
      update: {},
    });
  }

  async updateSettings(value: unknown) {
    const settings = parseSettings(value);
    return this.prisma.storeSettings.upsert({
      where: { id: 'store' },
      create: { id: 'store', ...settings },
      update: settings,
    });
  }
}
