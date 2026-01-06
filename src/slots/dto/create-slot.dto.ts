import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '22/04/2025' })
  date!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '07:00 AM' })
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '10:00 PM' })
  endTime!: string;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 40 })
  durationMinutes!: number;
}
