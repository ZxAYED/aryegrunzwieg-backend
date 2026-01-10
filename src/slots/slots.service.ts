import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SlotStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sendResponse } from '../utils/sendResponse';
import { CreateSlotDto } from './dto/create-slot.dto';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSlotDto: CreateSlotDto) {
    const date = this.parseDateYmd(createSlotDto.date);
    const startMinutes = this.parseTime24(createSlotDto.startTime);
    const endMinutes = this.parseTime24(createSlotDto.endTime);

    if (endMinutes <= startMinutes) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const startTime = this.formatTime24(startMinutes);
    const endTime = this.formatTime24(endMinutes);

    const existingSlots = await this.prisma.slot.findMany({
      where: { date },
      select: { id: true, startTime: true, endTime: true },
    });

    for (const slot of existingSlots) {
      const existingStart = this.parseTime24(slot.startTime);
      const existingEnd = this.parseTime24(slot.endTime);

      if (startMinutes === existingStart && endMinutes === existingEnd) {
        throw new BadRequestException(
          'Slot already exists for the same time range',
        );
      }

      if (startMinutes < existingEnd && endMinutes > existingStart) {
        throw new BadRequestException('Slot overlaps with an existing slot');
      }
    }

    const created = await this.prisma.slot.create({
      data: {
        date,
        startTime,
        endTime,
        status: SlotStatus.AVAILABLE,
      },
    });

    return sendResponse('Slot created successfully', created);
  }

  async findAll(params: { status?: SlotStatus; date?: string }) {
    const { status, date } = params;
    const normalizedDate = date ? this.parseDateYmd(date) : undefined;

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

  async updateStatus(id: string, status: SlotStatus) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    if (status !== SlotStatus.BOOKED && status !== SlotStatus.DISABLED) {
      throw new BadRequestException('status must be BOOKED or DISABLED');
    }

    if (slot.status === SlotStatus.BOOKED && status === SlotStatus.DISABLED) {
      throw new BadRequestException('Cannot disable a booked slot');
    }

    if (slot.status === SlotStatus.DISABLED && status === SlotStatus.BOOKED) {
      throw new BadRequestException('Cannot book a disabled slot');
    }

    const updatedSlot = await this.prisma.slot.update({
      where: { id },
      data: { status },
    });
    return sendResponse('Slot status updated successfully', updatedSlot);
  }

  async remove(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.status === SlotStatus.BOOKED) {
      throw new BadRequestException('Cannot delete a booked slot');
    }

    if (slot._count.orders > 0) {
      throw new BadRequestException('Cannot delete a slot with orders');
    }

    await this.prisma.slot.delete({
      where: { id },
    });
    return sendResponse('Slot deleted successfully', { id });
  }

  private parseDateYmd(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

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

  private parseTime24(value: string) {
    const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
    if (!match) {
      throw new BadRequestException('time must be in HH:mm format');
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new BadRequestException('time must be a valid 24-hour time');
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
