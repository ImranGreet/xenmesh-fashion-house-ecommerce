import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { CampaignType, PromotionTarget } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../database/prisma.service.js';

const campaignTypes = [
  'SELECTED_PRODUCTS',
  'CATEGORY',
  'MONTHLY',
  'EVENT',
] as const;
const targetTypes = ['PRODUCTS', 'CATEGORY', 'STOREWIDE'] as const;

function isCampaignType(value: unknown): value is CampaignType {
  return (
    typeof value === 'string' &&
    (campaignTypes as readonly string[]).includes(value)
  );
}

function isTargetType(value: unknown): value is PromotionTarget {
  return (
    typeof value === 'string' &&
    (targetTypes as readonly string[]).includes(value)
  );
}

type ProductInput = {
  name: string;
  categoryId: number;
  sku: string;
  description?: string | null;
  price: number;
  stock: number;
};

type PromotionInput = {
  title: string;
  campaignType: CampaignType;
  targetType: PromotionTarget;
  targetValue?: string | null;
  targetProductIds: number[];
  discountPercent: number;
  startsAt: Date;
  endsAt: Date;
  active: boolean;
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

function productInput(value: unknown, partial = false): Partial<ProductInput> {
  const data = record(value);
  const result: Partial<ProductInput> = {};
  if (!partial || 'name' in data) result.name = text(data.name, 'Name', 160);
  if (!partial || 'categoryId' in data) {
    if (
      typeof data.categoryId !== 'number' ||
      !Number.isInteger(data.categoryId) ||
      data.categoryId < 1
    ) {
      throw new BadRequestException('Choose a valid category.');
    }
    result.categoryId = data.categoryId;
  }
  if (!partial || 'sku' in data) result.sku = text(data.sku, 'SKU', 64);
  if ('description' in data) {
    result.description =
      data.description === null || data.description === ''
        ? null
        : text(data.description, 'Description', 5000);
  }
  if (!partial || 'price' in data) {
    if (
      typeof data.price !== 'number' ||
      !Number.isFinite(data.price) ||
      data.price < 0 ||
      data.price > 99_999_999.99
    ) {
      throw new BadRequestException('Price must be a valid non-negative amount.');
    }
    result.price = data.price;
  }
  if (!partial || 'stock' in data) {
    if (
      typeof data.stock !== 'number' ||
      !Number.isInteger(data.stock) ||
      data.stock < 0 ||
      data.stock > 2_147_483_647
    ) {
      throw new BadRequestException('Stock must be a non-negative whole number.');
    }
    result.stock = data.stock;
  }
  return result;
}

function promotionInput(value: unknown, partial = false): Partial<PromotionInput> {
  const data = record(value);
  const result: Partial<PromotionInput> = {};
  if (!partial || 'title' in data)
    result.title = text(data.title, 'Title', 160);
  if (!partial || 'campaignType' in data) {
    if (!isCampaignType(data.campaignType)) {
      throw new BadRequestException('Choose a valid campaign type.');
    }
    result.campaignType = data.campaignType;
  }
  if (!partial || 'targetType' in data) {
    if (!isTargetType(data.targetType)) {
      throw new BadRequestException('Choose a valid promotion target.');
    }
    result.targetType = data.targetType;
  }
  if ('targetValue' in data) {
    result.targetValue =
      data.targetValue === null || data.targetValue === ''
        ? null
        : text(data.targetValue, 'Target', 160);
  } else if (!partial) {
    result.targetValue = null;
  }
  if ('targetProductIds' in data || !partial) {
    if (
      data.targetProductIds !== undefined &&
      (!Array.isArray(data.targetProductIds) ||
        !data.targetProductIds.every(
          (id): id is number =>
            typeof id === 'number' && Number.isInteger(id) && id > 0,
        ))
    ) {
      throw new BadRequestException('Choose valid products for this offer.');
    }
    result.targetProductIds = [
      ...new Set(data.targetProductIds ?? []),
    ];
  }
  if (!partial || 'discountPercent' in data) {
    if (
      typeof data.discountPercent !== 'number' ||
      !Number.isInteger(data.discountPercent) ||
      data.discountPercent < 1 ||
      data.discountPercent > 100
    ) {
      throw new BadRequestException('Discount must be a whole number from 1 to 100.');
    }
    result.discountPercent = data.discountPercent;
  }
  if (!partial || 'startsAt' in data) {
    result.startsAt = date(data.startsAt, 'Start date');
  }
  if (!partial || 'endsAt' in data) {
    result.endsAt = date(data.endsAt, 'End date');
  }
  if (result.startsAt && result.endsAt && result.endsAt <= result.startsAt) {
    throw new BadRequestException('End date must be after the start date.');
  }
  if ('active' in data || !partial) {
    if (data.active !== undefined && typeof data.active !== 'boolean') {
      throw new BadRequestException('Active must be true or false.');
    }
    result.active = data.active === undefined ? true : data.active;
  }
  const targetType = result.targetType;
  const targetValue = result.targetValue;
  if (targetType === 'CATEGORY' && !targetValue) {
    throw new BadRequestException('Choose a category for this offer.');
  }
  if (targetType === 'PRODUCTS' && !result.targetProductIds?.length) {
    throw new BadRequestException('Choose at least one product for this offer.');
  }
  if (targetType === 'STOREWIDE' && targetValue) {
    throw new BadRequestException('Storewide offers cannot have a target value.');
  }
  return result;
}

function date(value: unknown, field: string): Date {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new BadRequestException(`${field} must be a valid date.`);
  }
  return new Date(value);
}

function serializedProduct<
  T extends { price: Prisma.Decimal; category: { name: string } },
>(product: T) {
  return {
    ...product,
    category: product.category.name,
    price: Number(product.price),
  };
}

function categorySlug(name: string) {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new BadRequestException('Category name must contain letters or numbers.');
  return slug;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(activeOnly = false) {
    return this.prisma.category.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(value: unknown) {
    const name = text(record(value).name, 'Category name', 80)!;
    try {
      return await this.prisma.category.create({
        data: { name, slug: categorySlug(name) },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A category with this name already exists.');
      }
      throw error;
    }
  }

  async updateCategory(id: number, value: unknown) {
    const name = text(record(value).name, 'Category name', 80)!;
    try {
      const current = await this.prisma.category.findUnique({
        where: { id },
        select: { name: true },
      });
      if (!current) throw new NotFoundException('Category not found.');
      const category = await this.prisma.$transaction(async (transaction) => {
        if (current.name !== name) {
          await transaction.promotion.updateMany({
            where: { targetType: 'CATEGORY', targetValue: current.name },
            data: { targetValue: name },
          });
        }
        return transaction.category.update({
          where: { id },
          data: { name, slug: categorySlug(name) },
        });
      });
      return category;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException('Category not found.');
        if (error.code === 'P2002') {
          throw new ConflictException('A category with this name already exists.');
        }
      }
      throw error;
    }
  }

  async deleteCategory(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Category not found.');
    if (category._count.products > 0) {
      throw new ConflictException('Move or remove this category’s products before deleting it.');
    }
    const promotion = await this.prisma.promotion.findFirst({
      where: { targetType: 'CATEGORY', targetValue: category.name },
      select: { id: true },
    });
    if (promotion) {
      throw new ConflictException('Delete or update this category’s promotions before deleting it.');
    }
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  async listProducts(search?: string) {
    const where: Prisma.ProductWhereInput = search?.trim()
      ? {
          OR: [
            { name: { contains: search.trim() } },
            { sku: { contains: search.trim() } },
            { category: { name: { contains: search.trim() } } },
          ],
        }
      : {};
    const products = await this.prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { category: { select: { name: true } } },
    });
    return products.map(serializedProduct);
  }

  async listPublicProducts() {
    const now = new Date();
    const [products, promotions] = await Promise.all([
      this.prisma.product.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { category: { select: { name: true } } },
      }),
      this.prisma.promotion.findMany({
        where: {
          active: true,
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
        include: { products: { select: { productId: true } } },
      }),
    ]);

    return products.map((product) => {
      const price = Number(product.price);
      const applicablePromotion = promotions
        .filter((promotion) => {
          if (promotion.targetType === 'STOREWIDE') return true;
          if (promotion.targetType === 'CATEGORY') {
            return (
              promotion.targetValue?.toLowerCase() ===
              product.category.name.toLowerCase()
            );
          }
          return promotion.products.some(
            ({ productId }) => productId === product.id,
          );
        })
        .sort((left, right) => right.discountPercent - left.discountPercent)[0];

      if (!applicablePromotion) return serializedProduct(product);
      return {
        ...serializedProduct(product),
        discountPercent: applicablePromotion.discountPercent,
        salePrice: Number(
          (price * (1 - applicablePromotion.discountPercent / 100)).toFixed(2),
        ),
        promotion: applicablePromotion.title,
      };
    });
  }

  async createProduct(value: unknown) {
    const product = productInput(value) as ProductInput;
    await this.assertCategoryActive(product.categoryId);
    try {
      return serializedProduct(
        await this.prisma.product.create({
          data: { ...product, price: new Prisma.Decimal(product.price) },
          include: { category: { select: { name: true } } },
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A product with this SKU already exists.');
      }
      throw error;
    }
  }

  async updateProduct(id: number, value: unknown) {
    const product = productInput(value, true);
    if (product.categoryId !== undefined) {
      await this.assertCategoryActive(product.categoryId);
    }
    const data =
      product.price === undefined
        ? product
        : { ...product, price: new Prisma.Decimal(product.price) };
    try {
      return serializedProduct(
        await this.prisma.product.update({
          where: { id },
          data,
          include: { category: { select: { name: true } } },
        }),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException('Product not found.');
        if (error.code === 'P2002') {
          throw new ConflictException('A product with this SKU already exists.');
        }
      }
      throw error;
    }
  }

  async deleteProduct(id: number) {
    try {
      await this.prisma.product.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Product not found.');
      }
      throw error;
    }
  }

  async listPromotions(activeOnly = false) {
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: activeOnly
        ? { active: true, startsAt: { lte: now }, endsAt: { gt: now } }
        : undefined,
      include: {
        products: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { startsAt: 'desc' },
    });
    return promotions.map(({ products, ...promotion }) => ({
      ...promotion,
      targetProductIds: products.map(({ product }) => product.id),
      targetProductNames: products.map(({ product }) => product.name),
      status: !promotion.active
        ? 'PAUSED'
        : promotion.startsAt > now
          ? 'SCHEDULED'
          : promotion.endsAt <= now
            ? 'ENDED'
            : 'LIVE',
      currentlyLive:
        promotion.active &&
        promotion.startsAt <= now &&
        promotion.endsAt > now,
    }));
  }

  async createPromotion(value: unknown) {
    const input = promotionInput(value) as PromotionInput;
    const { targetProductIds, ...data } = input;
    await this.assertProductsExist(targetProductIds);
    await this.assertCategoryTarget(input.targetType, input.targetValue);
    return this.prisma.promotion.create({
      data: {
        ...data,
        products: {
          create: targetProductIds.map((productId) => ({ productId })),
        },
      },
    });
  }

  async updatePromotion(id: number, value: unknown) {
    const input = promotionInput(value, true);
    const { targetProductIds, ...data } = input;
    if (targetProductIds) await this.assertProductsExist(targetProductIds);
    if (
      input.targetType !== undefined &&
      (input.targetType === 'CATEGORY' || input.targetValue)
    ) {
      await this.assertCategoryTarget(input.targetType, input.targetValue);
    }
    try {
      return await this.prisma.promotion.update({
        where: { id },
        data: {
          ...data,
          ...(targetProductIds === undefined
            ? {}
            : {
                products: {
                  deleteMany: {},
                  create: targetProductIds.map((productId) => ({ productId })),
                },
              }),
        },
        include: {
          products: { include: { product: { select: { id: true, name: true } } } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Promotion not found.');
      }
      throw error;
    }
  }

  async deletePromotion(id: number) {
    try {
      await this.prisma.promotion.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Promotion not found.');
      }
      throw error;
    }
  }

  private async assertProductsExist(productIds: number[]) {
    if (!productIds.length) return;
    const count = await this.prisma.product.count({
      where: { id: { in: productIds } },
    });
    if (count !== productIds.length) {
      throw new BadRequestException('One or more selected products do not exist.');
    }
  }

  private async assertCategoryActive(categoryId: number) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, active: true },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException('Choose an active store category.');
    }
  }

  private async assertCategoryTarget(
    targetType: PromotionTarget,
    targetValue?: string | null,
  ) {
    if (targetType !== 'CATEGORY' || !targetValue) return;
    const category = await this.prisma.category.findFirst({
      where: { name: { equals: targetValue }, active: true },
      select: { name: true },
    });
    if (!category) {
      throw new BadRequestException('Choose an active store category for this offer.');
    }
  }
}
