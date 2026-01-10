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
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SlotStatus } from '@prisma/client';
import { Roles } from '../common/decorator/rolesDecorator';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';
import { SlotsService } from './slots.service';

@ApiTags('Slots')
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a slot' })
  @Roles('ADMIN')
  create(@Body() createSlotDto: CreateSlotDto) {
    return this.slotsService.create(createSlotDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all slots' })
  @ApiQuery({ name: 'status', required: false, enum: SlotStatus })
  @ApiQuery({ name: 'date', required: false })
  @Roles('ADMIN', 'CUSTOMER', 'TECHNICIAN')
  findAll(@Query('status') status?: SlotStatus, @Query('date') date?: string) {
    return this.slotsService.findAll({
      status,
      date,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a slot by ID' })
  @Roles('ADMIN', 'CUSTOMER', 'TECHNICIAN')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.slotsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update slot status' })
  @Roles('ADMIN')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateSlotStatusDto: UpdateSlotStatusDto,
  ) {
    return this.slotsService.updateStatus(id, updateSlotStatusDto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a slot' })
  @Roles('ADMIN')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.slotsService.remove(id);
  }
}
