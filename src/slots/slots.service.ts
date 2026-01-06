import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SlotStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sendResponse } from '../utils/sendResponse';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSlotDto: CreateSlotDto) {
    const date = this.parseDateDmy(createSlotDto.date);
    const startMinutes = this.parseTime12(createSlotDto.startTime);
    const endMinutes = this.parseTime12(createSlotDto.endTime);

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('endTime must be after startTime');
    }

    if (!Number.isInteger(createSlotDto.durationMinutes)) {
      throw new BadRequestException('durationMinutes must be an integer');
    }

    if (createSlotDto.durationMinutes <= 0) {
      throw new BadRequestException('durationMinutes must be positive');
    }

    const slots = this.buildSlots(
      date,
      startMinutes,
      endMinutes,
      createSlotDto.durationMinutes,
    );

    if (slots.length === 0) {
      throw new BadRequestException('No slots to create with given duration');
    }

    await this.prisma.slot.createMany({
      data: slots,
    });

    return sendResponse('Slots created successfully', {
      createdCount: slots.length,
    });
  }

  async findAll(params: { status?: SlotStatus; date?: string }) {
    const { status, date } = params;
    const normalizedDate = date ? this.parseDateDmy(date) : undefined;

    const slots = await this.prisma.slot.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(normalizedDate ? { date: normalizedDate } : {}),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return sendResponse('Slots fetched successfully', slots);
  }

  async findOne(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    return sendResponse('Slot fetched successfully', slot);
  }

  async update(id: string, updateSlotDto: UpdateSlotDto) {
    await this.findOne(id);

    const data: {
      date?: Date;
      startTime?: string;
      endTime?: string;
    } = {};

    if (updateSlotDto.date) {
      data.date = this.parseDateDmy(updateSlotDto.date);
    }

    if (updateSlotDto.startTime) {
      const minutes = this.parseTime12(updateSlotDto.startTime);
      data.startTime = this.formatTime24(minutes);
    }

    if (updateSlotDto.endTime) {
      const minutes = this.parseTime12(updateSlotDto.endTime);
      data.endTime = this.formatTime24(minutes);
    }

    const slot = await this.prisma.slot.update({
      where: { id },
      data,
    });
    return sendResponse('Slot updated successfully', slot);
  }

  async updateStatus(id: string, status: SlotStatus) {
    await this.findOne(id);
    const slot = await this.prisma.slot.update({
      where: { id },
      data: { status },
    });
    return sendResponse('Slot status updated successfully', slot);
  }

  async remove(id: string) {
    await this.findOne(id);
    const slot = await this.prisma.slot.delete({
      where: { id },
    });
    return sendResponse('Slot deleted successfully', slot);
  }

  private buildSlots(
    date: Date,
    startMinutes: number,
    endMinutes: number,
    durationMinutes: number,
  ) {
    const slots: {
      date: Date;
      startTime: string;
      endTime: string;
      status: SlotStatus;
    }[] = [];

    for (
      let current = startMinutes;
      current + durationMinutes <= endMinutes;
      current += durationMinutes
    ) {
      slots.push({
        date,
        startTime: this.formatTime24(current),
        endTime: this.formatTime24(current + durationMinutes),
        status: SlotStatus.AVAILABLE,
      });
    }

    return slots;
  }

  private parseDateDmy(value: string) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) {
      throw new BadRequestException('date must be in DD/MM/YYYY format');
    }
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('date must be a valid calendar date');
    }
    return date;
  }

  private parseTime12(value: string) {
    const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(value.trim());
    if (!match) {
      throw new BadRequestException(
        'time must be in hh:mm AM/PM format',
      );
    }
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 1 ||
      hours > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('time must be a valid 12-hour time');
    }

    if (hours === 12) {
      hours = 0;
    }
    if (period === 'PM') {
      hours += 12;
    }

    return hours * 60 + minutes;
  }

  private formatTime24(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }
}
