import { SystemType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

class FloorInletDto {
  @IsString()
  @IsNotEmpty()
  floorName!: string;

  @IsInt()
  @IsNotEmpty()
  inletCount!: number;
}

export class UpdateEquipmentDto {
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @IsString()
  @IsOptional()
  modelNumber?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsEnum(SystemType)
  @IsOptional()
  systemType?: SystemType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloorInletDto)
  @IsOptional()
  floors?: FloorInletDto[];
}
