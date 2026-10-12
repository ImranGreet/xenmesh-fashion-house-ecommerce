import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import type { OrderStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../database/prisma.service.js';

const statuses = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Request body must be an object.');
  }
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  field: string,
  maxLength: number,
  optional = false,
): string | undefined {
  if (optional && (value === undefined || value === null || value === '')) {
    return undefined;
  }
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.trim().length > maxLength
  ) {
    throw new BadRequestException(`${field} is required (max ${maxLength}).`);
  }
  return value.trim();
}

function orderInput(value: unknown) {
  const data = record(value);
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 50) {
    throw new BadRequestException('Choose between 1 and 50 cart items.');
  }
  const quantities = new Map<number, number>();
  for (const entry of data.items) {
    const item = record(entry);
    if (
      !Number.isInteger(item.productId) ||
      typeof item.productId !== 'number' ||
      item.productId < 1 ||
      !Number.isInteger(item.quantity) ||
      typeof item.quantity !== 'number' ||
      item.quantity < 1 ||
      item.quantity > 99
    ) {
      throw new BadRequestException('Each cart item must have a valid product and quantity.');
    }
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }
  if ([...quantities.values()].some((quantity) => quantity > 99)) {
    throw new BadRequestException('A product quantity cannot exceed 99.');
  }

  const email = text(data.email, 'Email', 254, true);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('Enter a valid email address.');
  }
  const phone = text(data.phone, 'Phone number', 32)!;
  if (phone.replace(/\D/g, '').length < 7) {
    throw new BadRequestException('Enter a valid phone number.');
  }

  return {
    customerName: text(data.customerName, 'Full name', 160)!,
    phone,
    email,
    address: text(data.address, 'Delivery address', 500)!,
    city: text(data.city, 'City or area', 100, true),
    notes: text(data.notes, 'Order notes', 1000, true),
    items: [...quantities].map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(value: unknown) {
    const input = orderInput(value);
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const [products, promotions] = await Promise.all([
        transaction.product.findMany({
          where: { id: { in: input.items.map(({ productId }) => productId) } },
          include: { category: { select: { name: true } } },
        }),
        transaction.promotion.findMany({
          where: {
            active: true,
            startsAt: { lte: now },
            endsAt: { gt: now },
          },
          include: { products: { select: { productId: true } } },
        }),
      ]);
      if (products.length !== input.items.length) {
        throw new BadRequestException('One or more selected products are no longer available.');
      }

      const lineItems = input.items.map(({ productId, quantity }) => {
        const product = products.find((candidate) => candidate.id === productId)!;
        if (product.stock < quantity) {
          throw new ConflictException(`${product.name} does not have enough stock.`);
        }
        const promotion = promotions
          .filter((candidate) => {
            if (candidate.targetType === 'STOREWIDE') return true;
            if (candidate.targetType === 'CATEGORY') {
              return candidate.targetValue?.toLowerCase() === product.category.name.toLowerCase();
            }
            return candidate.products.some((item) => item.productId === product.id);
          })
          .sort((left, right) => right.discountPercent - left.discountPercent)[0];
        const unitPrice = Number(
          promotion
            ? (Number(product.price) * (1 - promotion.discountPercent / 100)).toFixed(2)
            : product.price,
        );
        return {
          product,
          quantity,
          unitPrice,
          lineTotal: Number((unitPrice * quantity).toFixed(2)),
        };
      });
      const total = Number(
        lineItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
      );

      for (const item of lineItems) {
        const update = await transaction.product.updateMany({
          where: { id: item.product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (update.count !== 1) {
          throw new ConflictException(`${item.product.name} is no longer available in that quantity.`);
        }
      }

      const order = await transaction.order.create({
        data: {
          number: `XFS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
          customerName: input.customerName,
          phone: input.phone,
          email: input.email,
          address: input.address,
          city: input.city,
          notes: input.notes,
          paymentMethod: 'CASH_ON_DELIVERY',
          subtotal: new Prisma.Decimal(total),
          total: new Prisma.Decimal(total),
          items: {
            create: lineItems.map((item) => ({
              productId: item.product.id,
              name: item.product.name,
              sku: item.product.sku,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              quantity: item.quantity,
              lineTotal: new Prisma.Decimal(item.lineTotal),
            })),
          },
        },
        include: { items: true },
      });
      return this.serialize(order);
    });
  }

  async listOrders() {
    const orders = await this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.serialize(order));
  }

  async updateStatus(id: number, value: unknown) {
    const data = record(value);
    if (
      typeof data.status !== 'string' ||
      !(statuses as readonly string[]).includes(data.status)
    ) {
      throw new BadRequestException('Choose a valid order status.');
    }
    const nextStatus = data.status as OrderStatus;
    return this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Order not found.');
      if (order.status === nextStatus) return this.serialize(order);
      if (!allowedTransitions[order.status].includes(nextStatus)) {
        throw new BadRequestException(`An order cannot move from ${order.status} to ${nextStatus}.`);
      }
      const claimedTransition = await transaction.order.updateMany({
        where: { id, status: order.status },
        data: { status: nextStatus },
      });
      if (claimedTransition.count !== 1) {
        throw new ConflictException('The order status changed. Refresh and try again.');
      }
      if (nextStatus === 'CANCELLED') {
        for (const item of order.items) {
          await transaction.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return this.serialize({ ...order, status: nextStatus });
    });
  }

  private serialize<T extends {
    subtotal: Prisma.Decimal;
    total: Prisma.Decimal;
    items: Array<{
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
  }>(order: T) {
    return {
      ...order,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    };
  }
}
