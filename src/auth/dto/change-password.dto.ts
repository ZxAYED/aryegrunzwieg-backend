import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'OldP@ssw0rd!' })
  oldPassword!: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'NewP@ssw0rd!' })
  newPassword!: string;
}
