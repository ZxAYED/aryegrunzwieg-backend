import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SlotStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSlotDto: CreateSlotDto) {
    const date = this.parseDateOnly(createSlotDto.date);
    const { hours, minutes } = this.parseTime(createSlotDto.startTime);

    const startDateTime = this.buildDateTime(date, hours, minutes);
    const endDateTime = this.addMinutes(
      startDateTime,
      createSlotDto.durationMinutes,
    );

    this.assertSameDay(startDateTime, endDateTime);

    return this.prisma.slot.create({
      data: {
        date,
        startTime: this.formatTime(hours, minutes),
        endTime: this.formatTime(
          endDateTime.getUTCHours(),
          endDateTime.getUTCMinutes(),
        ),
        startDateTime,
        endDateTime,
        status: createSlotDto.status ?? SlotStatus.AVAILABLE,
      },
    });
  }

  async findAll(params: { status?: SlotStatus; date?: string }) {
    const { status, date } = params;
    const normalizedDate = date ? this.parseDateOnly(date) : undefined;

    return this.prisma.slot.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(normalizedDate ? { date: normalizedDate } : {}),
      },
      orderBy: [{ date: 'asc' }, { startDateTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  async update(id: string, updateSlotDto: UpdateSlotDto) {
    const existing = await this.findOne(id);

    const shouldRebuild =
      updateSlotDto.date !== undefined ||
      updateSlotDto.startTime !== undefined ||
      updateSlotDto.durationMinutes !== undefined;

    const data: {
      date?: Date;
      startTime?: string;
      endTime?: string;
      startDateTime?: Date;
      endDateTime?: Date;
      status?: SlotStatus;
    } = {};

    if (shouldRebuild) {
      const nextDate = updateSlotDto.date
        ? this.parseDateOnly(updateSlotDto.date)
        : existing.date;

      const { hours, minutes } = updateSlotDto.startTime
        ? this.parseTime(updateSlotDto.startTime)
        : {
            hours: existing.startDateTime.getUTCHours(),
            minutes: existing.startDateTime.getUTCMinutes(),
          };

      const durationMinutes =
        updateSlotDto.durationMinutes ?? this.diffMinutes(
          existing.startDateTime,
          existing.endDateTime,
        );

      const nextStartDateTime = this.buildDateTime(
        nextDate,
        hours,
        minutes,
      );
      const nextEndDateTime = this.addMinutes(
        nextStartDateTime,
        durationMinutes,
      );

      this.assertSameDay(nextStartDateTime, nextEndDateTime);

      data.date = nextDate;
      data.startTime = this.formatTime(hours, minutes);
      data.endTime = this.formatTime(
        nextEndDateTime.getUTCHours(),
        nextEndDateTime.getUTCMinutes(),
      );
      data.startDateTime = nextStartDateTime;
      data.endDateTime = nextEndDateTime;
    }

    if (updateSlotDto.status) {
      data.status = updateSlotDto.status;
    }

    return this.prisma.slot.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, status: SlotStatus) {
    await this.findOne(id);
    return this.prisma.slot.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.slot.delete({
      where: { id },
    });
  }

  private parseDateOnly(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('date must be a valid ISO date');
    }
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth();
    const day = parsed.getUTCDate();
    return new Date(Date.UTC(year, month, day));
  }

  private parseTime(value: string) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException('startTime must be in HH:mm format');
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
      throw new BadRequestException('startTime must be a valid time');
    }
    return { hours, minutes };
  }

  private buildDateTime(date: Date, hours: number, minutes: number) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hours,
        minutes,
      ),
    );
  }

  private addMinutes(date: Date, minutes: number) {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new BadRequestException('durationMinutes must be a positive integer');
    }
    return new Date(date.getTime() + minutes * 60_000);
  }

  private assertSameDay(startDateTime: Date, endDateTime: Date) {
    if (
      startDateTime.getUTCFullYear() !== endDateTime.getUTCFullYear() ||
      startDateTime.getUTCMonth() !== endDateTime.getUTCMonth() ||
      startDateTime.getUTCDate() !== endDateTime.getUTCDate()
    ) {
      throw new BadRequestException(
        'slot duration must stay within the same day',
      );
    }
  }

  private formatTime(hours: number, minutes: number) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }

  private diffMinutes(startDateTime: Date, endDateTime: Date) {
    const diff = endDateTime.getTime() - startDateTime.getTime();
    return Math.max(1, Math.round(diff / 60_000));
  }
}
