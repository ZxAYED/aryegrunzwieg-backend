import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';

import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Roles } from '../common/decorator/rolesDecorator';
import { CustomerAddressDto } from './dto/create-customer.dto';
import { User } from '@prisma/client';

@ApiBearerAuth('bearer')
@ApiTags('Customers')
@Roles('ADMIN', 'STAFF')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current customer profile' })
  @ApiBearerAuth('bearer')
  @Roles('CUSTOMER')
  me(@Req() req: { user?: User }) {
    const userId = this.getUserId(req);
    return this.customersService.findByUserId(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current customer profile' })
  @ApiBearerAuth('bearer')
  @Roles('CUSTOMER')
  updateMe(
    @Req() req: { user?: User },
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    const userId = this.getUserId(req);
    return this.customersService.updateByUserId(userId, updateCustomerDto);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'List current customer addresses' })
  @ApiBearerAuth('bearer')
  @Roles('CUSTOMER')
  listMyAddresses(@Req() req: { user?: User }) {
    const userId = this.getUserId(req);
    return this.customersService.listAddressesByUserId(userId);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Add a new address for current customer' })
  @ApiBearerAuth('bearer')
  @Roles('CUSTOMER')
  createMyAddress(
    @Req() req: { user?: User },
    @Body() dto: CustomerAddressDto,
  ) {
    const userId = this.getUserId(req);
    return this.customersService.createAddressByUserId(userId, dto);
  }

  @Patch('me/addresses/:addressId')
  @ApiOperation({ summary: 'Update a specific address for current customer' })
  @ApiBearerAuth('bearer')
  @Roles('CUSTOMER')
  updateMyAddress(
    @Req() req: { user?: User },
    @Param('addressId') addressId: string,
    @Body() dto: CustomerAddressDto,
  ) {
    const userId = this.getUserId(req);
    return this.customersService.updateAddressByUserId(
      userId,
      addressId,
      dto,
    );
  }

  @Delete('me/addresses/:addressId')
  @ApiOperation({ summary: 'Delete a specific address for current customer' })
  @ApiBearerAuth('bearer')
  @Roles('CUSTOMER')
  deleteMyAddress(
    @Req() req: { user?: User },
    @Param('addressId') addressId: string,
  ) {
    const userId = this.getUserId(req);
    return this.customersService.deleteAddressByUserId(userId, addressId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiBearerAuth('bearer')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll({ page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiBearerAuth('bearer')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiBearerAuth('bearer')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  // Address CRUD

  @Get(':id/addresses')
  @ApiOperation({ summary: 'List customer addresses' })
  @ApiBearerAuth('bearer')
  listAddresses(@Param('id') customerId: string) {
    return this.customersService.listAddresses(customerId);
  }

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add a new address for customer' })
  @ApiBearerAuth('bearer')
  createAddress(
    @Param('id') customerId: string,
    @Body() dto: CustomerAddressDto,
  ) {
    return this.customersService.createAddress(customerId, dto);
  }

  @Patch(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Update a specific customer address' })
  @ApiBearerAuth('bearer')
  updateAddress(
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
    @Body() dto: CustomerAddressDto,
  ) {
    return this.customersService.updateAddress(customerId, addressId, dto);
  }

  @Delete(':id/addresses/:addressId')
  @ApiOperation({ summary: 'Delete a specific customer address' })
  @ApiBearerAuth('bearer')
  deleteAddress(
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.deleteAddress(customerId, addressId);
  }

  private getUserId(req: { user?: User }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    return req.user.id;
  }
}
