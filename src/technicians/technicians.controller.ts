import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { Roles } from '../common/decorator/rolesDecorator';
import { Role, TechnicianStatus } from '@prisma/client';

@ApiTags('Technicians')
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new technician' })
  @ApiBody({ type: CreateTechnicianDto })
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.techniciansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a technician' })
  @ApiBody({ type: UpdateTechnicianDto })
  @Roles(Role.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateTechnicianDto: UpdateTechnicianDto,
  ) {
    return this.techniciansService.update(id, updateTechnicianDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a technician' })
  @Roles(Role.ADMIN)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.techniciansService.remove(id);
  }
}
