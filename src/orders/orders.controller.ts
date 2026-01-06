import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { Roles } from '../common/decorator/rolesDecorator';
import { OrderStatus } from '@prisma/client';

@ApiTags('Orders')
@Roles('ADMIN', 'STAFF')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'technicianId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: OrderStatus,
    @Query('customerId') customerId?: string,
    @Query('technicianId') technicianId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ordersService.findAll({
      page,
      limit,
      search,
      status,
      customerId,
      technicianId,
      from,
      to,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order (status, assignment, etc)' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm an order' })
  confirm(@Param('id') id: string) {
    return this.ordersService.confirm(id);
  }

  @Put(':id/equipment')
  @ApiOperation({ summary: 'Update equipment details for an order' })
  updateEquipment(
    @Param('id') id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
  ) {
    return this.ordersService.updateEquipment(id, updateEquipmentDto);
  }

  @Post(':id/media')
  @ApiOperation({ summary: 'Add media (photo/video) metadata to order' })
  addMedia(@Param('id') id: string, @Body() createMediaDto: CreateMediaDto) {
    return this.ordersService.addMedia(id, createMediaDto);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get transactions for an order' })
  getTransactions(@Param('id') id: string) {
    return this.ordersService.getTransactions(id);
  }
}
