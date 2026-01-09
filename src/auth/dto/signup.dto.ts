import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 'Apt 101' })
  @IsOptional()
  @IsString()
  apt?: string;

  @IsString()
  @ApiProperty({ example: 'New York' })
  @IsNotEmpty()
  city!: string;

  @IsString()
  @ApiProperty({ example: 'NY' })
  @IsNotEmpty()
  state!: string;

  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'zip must be a valid US ZIP code',
  })
  @ApiProperty({ example: '10001' })
  zip!: string;

  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com' })
  email!: string;

  @IsString()
  @MinLength(6)
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
  //   message:
  //     'password must include upper, lower, number, and special character',
  // })
  @ApiProperty({ example: 'Password123!' })
  password!: string;
}
