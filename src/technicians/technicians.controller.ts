import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { Roles } from '../common/decorator/rolesDecorator';
import { TechnicianStatus } from '@prisma/client';

@ApiTags('Technicians')
@Roles('ADMIN', 'STAFF')
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new technician' })
  create(@Body() createTechnicianDto: CreateTechnicianDto) {
    return this.techniciansService.create(createTechnicianDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all technicians' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TechnicianStatus })
  @ApiQuery({ name: 'verified', required: false, type: Boolean })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: TechnicianStatus,
    @Query('verified') verified?: boolean,
  ) {
    return this.techniciansService.findAll({
      page,
      limit,
      search,
      status,
      verified,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a technician by ID' })
  findOne(@Param('id') id: string) {
    return this.techniciansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a technician' })
  update(
    @Param('id') id: string,
    @Body() updateTechnicianDto: UpdateTechnicianDto,
  ) {
    return this.techniciansService.update(id, updateTechnicianDto);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify a technician' })
  verify(@Param('id') id: string) {
    return this.techniciansService.verify(id);
  }
}
