import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { CatalogService } from './catalog.service.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get('catalog/categories')
  publicCategories() {
    return this.catalogService.listCategories(true);
  }

  @Public()
  @Get('catalog/products')
  publicProducts() {
    return this.catalogService.listPublicProducts();
  }

  @Public()
  @Get('catalog/products/:id')
  publicProduct(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getPublicProduct(id);
  }

  @Public()
  @Get('catalog/promotions')
  publicPromotions() {
    return this.catalogService.listPromotions(true);
  }

  @Get('admin/categories')
  adminCategories() {
    return this.catalogService.listCategories();
  }

  @Post('admin/categories')
  createCategory(@Body() body: unknown) {
    return this.catalogService.createCategory(body);
  }

  @Patch('admin/categories/:id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.catalogService.updateCategory(id, body);
  }

  @Delete('admin/categories/:id')
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.deleteCategory(id);
  }

  @Get('admin/products')
  adminProducts(@Query('search') search?: string) {
    return this.catalogService.listProducts(search);
  }

  @Post('admin/products')
  createProduct(@Body() body: unknown) {
    return this.catalogService.createProduct(body);
  }

  @Patch('admin/products/:id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.catalogService.updateProduct(id, body);
  }

  @Delete('admin/products/:id')
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.deleteProduct(id);
  }

  @Get('admin/promotions')
  adminPromotions() {
    return this.catalogService.listPromotions();
  }

  @Post('admin/promotions')
  createPromotion(@Body() body: unknown) {
    return this.catalogService.createPromotion(body);
  }

  @Patch('admin/promotions/:id')
  updatePromotion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.catalogService.updatePromotion(id, body);
  }

  @Delete('admin/promotions/:id')
  deletePromotion(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.deletePromotion(id);
  }
}
