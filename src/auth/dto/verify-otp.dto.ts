import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  @ApiProperty({ example: 'customer@gmail.com' })
  email!: string;

  @IsString()
  @Length(5, 5)
  @ApiProperty({ example: '12345' })
  otp!: string;
}
