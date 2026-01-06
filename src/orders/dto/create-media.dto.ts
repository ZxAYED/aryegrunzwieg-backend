import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { MediaType } from '@prisma/client';

export class CreateMediaDto {
  @IsEnum(MediaType)
  @IsNotEmpty()
  type!: MediaType;

  @IsString()
  @IsUrl()
  @IsNotEmpty()
  url!: string;
}
