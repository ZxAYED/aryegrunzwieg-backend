import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  @ApiProperty({ example: '2025-04-22' })
  date!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'startTime must be in HH:mm format',
  })
  @ApiProperty({ example: '07:00' })
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, {
    message: 'endTime must be in HH:mm format',
  })
  @ApiProperty({ example: '10:00' })
  endTime!: string;
}
