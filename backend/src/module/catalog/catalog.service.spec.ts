import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { CatalogService } from './catalog.service.js';

describe('CatalogService', () => {
  let service: CatalogService;
  let productFindMany: ReturnType<typeof vi.fn>;
  let promotionFindMany: ReturnType<typeof vi.fn>;
  let promotionCreate: ReturnType<typeof vi.fn>;
  let productCount: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    productFindMany = vi.fn().mockResolvedValue([
      {
        id: 4,
        name: 'Everyday panjabi',
        categoryId: 2,
        category: { name: 'Panjabi' },
        sku: 'XFS-004',
        description: null,
        price: new Prisma.Decimal('1200.00'),
        stock: 8,
        updatedAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    ]);
    promotionFindMany = vi.fn().mockResolvedValue([]);
    promotionCreate = vi.fn();
    productCount = vi.fn().mockResolvedValue(1);
    const category = {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: 2 }),
    };
    const prisma = {
      product: { findMany: productFindMany, count: productCount },
      promotion: { findMany: promotionFindMany, create: promotionCreate },
      category,
    } as unknown as PrismaService;
    service = new CatalogService(prisma);
  });

  it('applies the best currently active promotion to public product prices', async () => {
    promotionFindMany.mockResolvedValue([
      {
        title: 'Panjabi edit',
        campaignType: 'CATEGORY',
        targetType: 'CATEGORY',
        targetValue: 'panjabi',
        discountPercent: 15,
        startsAt: new Date(Date.now() - 86400000),
        endsAt: new Date(Date.now() + 86400000),
        active: true,
        products: [],
      },
      {
        title: 'Store celebration',
        campaignType: 'EVENT',
        targetType: 'STOREWIDE',
        targetValue: null,
        discountPercent: 20,
        startsAt: new Date(Date.now() - 86400000),
        endsAt: new Date(Date.now() + 86400000),
        active: true,
        products: [],
      },
    ]);

    const products = await service.listPublicProducts();

    expect(products[0]).toMatchObject({
      id: 4,
      price: 1200,
      discountPercent: 20,
      salePrice: 960,
      promotion: 'Store celebration',
    });
    expect(promotionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          startsAt: expect.objectContaining({ lte: expect.any(Date) }),
          endsAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
  });

  it('rejects an invalid discount before creating a promotion', async () => {
    await expect(
      service.createPromotion({
        title: 'Too much',
        campaignType: 'EVENT',
        targetType: 'STOREWIDE',
        targetProductIds: [],
        discountPercent: 101,
        startsAt: '2026-10-01T00:00:00.000Z',
        endsAt: '2026-11-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(promotionCreate).not.toHaveBeenCalled();
  });

  it('rejects an offer that references products not in the catalog', async () => {
    productCount.mockResolvedValue(0);

    await expect(
      service.createPromotion({
        title: 'Selected pieces',
        campaignType: 'SELECTED_PRODUCTS',
        targetType: 'PRODUCTS',
        targetProductIds: [99],
        discountPercent: 10,
        startsAt: '2026-10-01T00:00:00.000Z',
        endsAt: '2026-11-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('One or more selected products do not exist.');

    expect(promotionCreate).not.toHaveBeenCalled();
  });
});
