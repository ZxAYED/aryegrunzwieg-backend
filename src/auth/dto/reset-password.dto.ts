import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @ApiProperty({ example: 'customer@gmail.com' })
  email!: string;

  @IsString()
  @Length(5, 5)
  @ApiProperty({ example: '12345' })
  otp!: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'NewStrongP@ss1!' })
  newPassword!: string;
}
