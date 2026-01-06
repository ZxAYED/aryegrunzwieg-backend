import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { SlotStatus } from '@prisma/client';
import { CreateSlotDto } from './create-slot.dto';

export class UpdateSlotDto extends PartialType(CreateSlotDto) {
  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
