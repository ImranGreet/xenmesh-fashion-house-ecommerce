import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../database/prisma.service.js';
import { SettingsService } from './settings.service.js';

describe('SettingsService', () => {
  let service: SettingsService;
  let upsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    upsert = vi.fn().mockResolvedValue({
      id: 'store',
      storeName: 'Xenmesh Fashion House',
      contactEmail: 'xen@gmail.com',
      phone: '01912444216',
      location: 'Dhaka, Bangladesh',
    });
    service = new SettingsService({
      storeSettings: { upsert },
    } as unknown as PrismaService);
  });

  it('seeds the default public details when none exist', async () => {
    const settings = await service.getSettings();
    expect(settings).toMatchObject({
      storeName: 'Xenmesh Fashion House',
      contactEmail: 'xen@gmail.com',
      phone: '01912444216',
      location: 'Dhaka, Bangladesh',
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'store' },
      update: {},
    }));
  });

  it('validates and saves administrator-edited public details', async () => {
    await service.updateSettings({
      storeName: 'Xenmesh Studio',
      contactEmail: 'hello@example.com',
      phone: '+8801912444216',
      location: 'Dhaka',
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'store' },
      update: {
        storeName: 'Xenmesh Studio',
        contactEmail: 'hello@example.com',
        phone: '+8801912444216',
        location: 'Dhaka',
      },
    }));
  });

  it('rejects malformed contact details', async () => {
    await expect(service.updateSettings({
      storeName: 'Xenmesh Studio',
      contactEmail: 'not-an-email',
      phone: 'phone',
      location: 'Dhaka',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
});
