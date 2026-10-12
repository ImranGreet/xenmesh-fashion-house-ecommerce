import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { OrdersService } from './orders.service.js';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('orders')
  createOrder(@Body() body: unknown) {
    return this.ordersService.createOrder(body);
  }

  @Get('admin/orders')
  listOrders() {
    return this.ordersService.listOrders();
  }

  @Patch('admin/orders/:id')
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ) {
    return this.ordersService.updateStatus(id, body);
  }
}
