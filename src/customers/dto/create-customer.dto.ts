import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John' })
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John' })
  lastName!: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'customer@example.com' })
  email!: string;

  @IsString()
  @ApiProperty({ example: '+1234567890' })
  @IsOptional()
  phone?: string;
}
