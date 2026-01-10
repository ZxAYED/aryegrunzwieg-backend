import { OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TechnicianStatus } from '@prisma/client';
import { CreateTechnicianDto } from './create-technician.dto';

export class UpdateTechnicianDto extends PartialType(
  OmitType(CreateTechnicianDto, ['password'] as const),
) {
  @IsOptional()
  @IsEnum(TechnicianStatus)
  status?: TechnicianStatus;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
