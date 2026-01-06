import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupTechnicianDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John' })
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Tech' })
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '5551234567' })
  phone!: string;

  @IsEmail()
  @ApiProperty({ example: 'technician@gmail.com' })
  email!: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: '123456' })
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
  //   message:
  //     'Password must include upper, lower, number, and special character',
  // })
  password!: string;
}
