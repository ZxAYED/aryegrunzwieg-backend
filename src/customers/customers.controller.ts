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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';

import { User } from '@prisma/client';
import { Roles } from '../common/decorator/rolesDecorator';
import {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
} from './dto/customer-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiBearerAuth('bearer')
@ApiTags('Customers')
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        addressLine: { type: 'string' },
        apartment: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  @Roles('CUSTOMER')
  updateMe(
    @Req() req: { user?: User },
    @Body() updateCustomerDto: UpdateCustomerDto,
    @UploadedFile() image?: UploadedImageFile,
  ) {
    const userId = this.getUserId(req);
    return this.customersService.updateByUserId(
      userId,
      updateCustomerDto,
      image,
    );
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
  @ApiBody({ type: CreateCustomerAddressDto })
  @Roles('CUSTOMER')
  createMyAddress(
    @Req() req: { user?: User },
    @Body() dto: CreateCustomerAddressDto,
  ) {
    const userId = this.getUserId(req);
    return this.customersService.createAddressByUserId(userId, dto);
  }

  @Patch('me/addresses/:addressId')
  @ApiOperation({
    summary:
      'Update a specific address for current customer , isDefault means set this address as default for customer',
  })
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'addressId',
    type: String,
    description: 'Address ID',
  })
  @ApiBody({ type: UpdateCustomerAddressDto })
  @Roles('CUSTOMER')
  updateMyAddress(
    @Req() req: { user?: User },
    @Param('addressId') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    const userId = this.getUserId(req);
    return this.customersService.updateAddressByUserId(userId, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  @ApiOperation({ summary: 'Delete a specific address for current customer' })
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'addressId',
    type: String,
    description: 'Address ID',
  })
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
  @Roles('ADMIN')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll({ page, limit, search });
  }

  private getUserId(req: { user?: User }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    return req.user.id;
  }
}

type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
};
