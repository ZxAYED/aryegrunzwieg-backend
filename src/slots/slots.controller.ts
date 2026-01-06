import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SlotStatus } from '@prisma/client';
import { Roles } from '../common/decorator/rolesDecorator';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { SlotsService } from './slots.service';

@ApiTags('Slots')
@Roles('ADMIN')
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  @ApiOperation({ summary: 'Create slots for a day' })
  create(@Body() createSlotDto: CreateSlotDto) {
    return this.slotsService.create(createSlotDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all slots' })
  @ApiQuery({ name: 'status', required: false, enum: SlotStatus })
  @ApiQuery({ name: 'date', required: false })
  findAll(@Query('status') status?: SlotStatus, @Query('date') date?: string) {
    return this.slotsService.findAll({
      status,
      date,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a slot by ID' })
  findOne(@Param('id') id: string) {
    return this.slotsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a slot' })
  update(@Param('id') id: string, @Body() updateSlotDto: UpdateSlotDto) {
    return this.slotsService.update(id, updateSlotDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update slot status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateSlotStatusDto: UpdateSlotStatusDto,
  ) {
    return this.slotsService.updateStatus(id, updateSlotStatusDto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a slot' })
  remove(@Param('id') id: string) {
    return this.slotsService.remove(id);
  }
}
