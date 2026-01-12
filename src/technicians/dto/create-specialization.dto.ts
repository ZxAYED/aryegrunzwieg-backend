import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSpecializationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'AC Repair' })
  name!: string;
}
