import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { TechnicianStatus } from '@prisma/client';

export class CreateTechnicianDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'tech@example.com' })
  email!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: '+15551234567' })
  phone?: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'Secret123' })
  password!: string;

  @IsOptional()
  @IsEnum(TechnicianStatus)
  @ApiPropertyOptional({ example: 'OFFLINE', enum: TechnicianStatus })
  status?: TechnicianStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({ example: ['AC Repair', 'HVAC'] })
  specializations?: string[];
}
