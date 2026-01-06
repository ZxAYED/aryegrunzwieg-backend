import { IsEnum } from 'class-validator';
import { SlotStatus } from '@prisma/client';

export class UpdateSlotStatusDto {
  @IsEnum(SlotStatus)
  status!: SlotStatus;
}
