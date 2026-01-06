import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SlotStatus } from '@prisma/client';

export class CreateSlotDto {
  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;
}
