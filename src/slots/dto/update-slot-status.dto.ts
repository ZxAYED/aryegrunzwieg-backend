import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SlotStatus } from '@prisma/client';

export class UpdateSlotStatusDto {
  @IsEnum(SlotStatus)
  @ApiProperty({ example: 'DISABLED', enum: SlotStatus })
  status!: SlotStatus;
}
