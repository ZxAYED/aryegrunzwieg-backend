import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { SlotStatus } from '@prisma/client';

const allowedStatuses = [SlotStatus.BOOKED, SlotStatus.DISABLED] as const;

export class UpdateSlotStatusDto {
  @IsIn(allowedStatuses)
  @ApiProperty({ example: 'DISABLED', enum: allowedStatuses })
  status!: (typeof allowedStatuses)[number];
}
