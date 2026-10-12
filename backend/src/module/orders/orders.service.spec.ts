import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../database/prisma.service.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  let service: OrdersService;
  let productFindMany: ReturnType<typeof vi.fn>;
  let promotionFindMany: ReturnType<typeof vi.fn>;
  let productUpdateMany: ReturnType<typeof vi.fn>;
  let orderCreate: ReturnType<typeof vi.fn>;
  let orderFindUnique: ReturnType<typeof vi.fn>;
  let orderUpdateMany: ReturnType<typeof vi.fn>;

  const product = {
    id: 7,
    name: 'Everyday panjabi',
    category: { name: 'Panjabi' },
    sku: 'XFS-007',
    price: new Prisma.Decimal('1200.00'),
    stock: 5,
  };

  beforeEach(() => {
    productFindMany = vi.fn().mockResolvedValue([product]);
    promotionFindMany = vi.fn().mockResolvedValue([]);
    productUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    orderCreate = vi.fn().mockImplementation(({ data }) => Promise.resolve({
      ...data,
      id: 1,
      status: 'NEW',
      paymentMethod: 'CASH_ON_DELIVERY',
      createdAt: new Date('2026-10-12T00:00:00.000Z'),
      updatedAt: new Date('2026-10-12T00:00:00.000Z'),
      items: data.items.create.map((item: Record<string, unknown>, index: number) => ({
        ...item,
        id: index + 1,
      })),
    }));
    orderFindUnique = vi.fn();
    orderUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const transaction = {
      product: { findMany: productFindMany, updateMany: productUpdateMany },
      promotion: { findMany: promotionFindMany },
      order: {
        create: orderCreate,
        findUnique: orderFindUnique,
        updateMany: orderUpdateMany,
      },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    } as unknown as PrismaService;
    service = new OrdersService(prisma);
  });

  it('creates an order at the current promotional price and decrements inventory', async () => {
    promotionFindMany.mockResolvedValue([{
      title: 'Panjabi edit',
      targetType: 'CATEGORY',
      targetValue: 'Panjabi',
      discountPercent: 20,
      products: [],
    }]);

    const order = await service.createOrder({
      customerName: 'Ayesha Rahman',
      phone: '01912444216',
      address: '12 Example Road',
      items: [{ productId: 7, quantity: 2 }],
    });

    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(orderCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        paymentMethod: 'CASH_ON_DELIVERY',
        total: new Prisma.Decimal('1920'),
        items: {
          create: [expect.objectContaining({
            unitPrice: new Prisma.Decimal('960'),
            quantity: 2,
            lineTotal: new Prisma.Decimal('1920'),
          })],
        },
      }),
    }));
    expect(order).toMatchObject({
      status: 'NEW',
      paymentMethod: 'CASH_ON_DELIVERY',
      total: 1920,
      items: [{ unitPrice: 960, lineTotal: 1920 }],
    });
  });

  it('rejects checkout when requested quantity is no longer in stock', async () => {
    productFindMany.mockResolvedValue([{ ...product, stock: 0 }]);

    await expect(service.createOrder({
      customerName: 'Ayesha Rahman',
      phone: '01912444216',
      address: '12 Example Road',
      items: [{ productId: 7, quantity: 1 }],
    })).rejects.toBeInstanceOf(ConflictException);

    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it('restores reserved stock when an order is cancelled', async () => {
    const existingOrder = {
      id: 1,
      number: 'XFS-TEST',
      customerName: 'Ayesha Rahman',
      phone: '01912444216',
      email: null,
      address: '12 Example Road',
      city: null,
      notes: null,
      subtotal: new Prisma.Decimal('1200'),
      total: new Prisma.Decimal('1200'),
      status: 'NEW',
      paymentMethod: 'CASH_ON_DELIVERY',
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [{
        id: 1,
        productId: 7,
        name: product.name,
        sku: product.sku,
        unitPrice: new Prisma.Decimal('1200'),
        quantity: 1,
        lineTotal: new Prisma.Decimal('1200'),
      }],
    };
    orderFindUnique.mockResolvedValue(existingOrder);

    await service.updateStatus(1, { status: 'CANCELLED' });

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'NEW' },
      data: { status: 'CANCELLED' },
    });
    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { stock: { increment: 1 } },
    });
  });
});
