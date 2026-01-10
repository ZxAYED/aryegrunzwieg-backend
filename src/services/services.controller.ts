import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role, ServiceStatus, User } from '@prisma/client';
import { Roles } from '../common/decorator/rolesDecorator';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiBody({ type: CreateServiceDto })
  @Roles(Role.ADMIN)
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ServiceStatus })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles('ADMIN', 'CUSTOMER', 'TECHNICIAN')
  findAll(
    @Req() req: { user?: User },
    @Query('search') search?: string,
    @Query('status') status?: ServiceStatus,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const isAdmin = req.user?.role === 'ADMIN';
    return this.servicesService.findAll({
      search,
      status: isAdmin ? status : ServiceStatus.ACTIVE,
      category,
      page,
      limit,
      includeInactive: isAdmin,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by ID' })
  @Roles(Role.ADMIN, Role.CUSTOMER, Role.TECHNICIAN)
  findOne(
    @Req() req: { user?: User },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const isAdmin = req.user?.role === 'ADMIN';
    return this.servicesService.findOne(id, isAdmin);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  @ApiBody({ type: UpdateServiceDto })
  @Roles(Role.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service' })
  @Roles(Role.ADMIN)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.servicesService.remove(id);
  }
}
