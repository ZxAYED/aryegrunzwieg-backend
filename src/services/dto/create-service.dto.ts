import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'AC Repair' })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Air Conditioning' })
  category!: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @ApiProperty({ example: 120.5 })
  basePrice!: number;

  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
    return value;
  })
  @ApiProperty({ example: ['Not cooling', 'Strange noise'] })
  commonIssues!: string[];

  @IsOptional()
  @IsEnum(ServiceStatus)
  @ApiPropertyOptional({ example: 'ACTIVE', enum: ServiceStatus })
  status?: ServiceStatus;

  @IsOptional()
  @IsUUID('4')
  @ApiPropertyOptional({ example: 'de2644a4-5de9-4140-806a-dc51f9324fd1' })
  specializationId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ApiPropertyOptional({
    example: ['de2644a4-5de9-4140-806a-dc51f9324fd1'],
  })
  specializationIds?: string[];
}
