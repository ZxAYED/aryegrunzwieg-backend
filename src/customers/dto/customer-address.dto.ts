import { ApiProperty, PartialType } from '@nestjs/swagger';
import { AddressLabel } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCustomerAddressDto {
  @IsOptional()
  @IsEnum(AddressLabel)
  @ApiProperty({ example: 'HOME', required: false })
  label?: AddressLabel;

  @IsNotEmpty()
  @ApiProperty({ example: '123 Main St' })
  addressLine!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Apt 4B', required: false })
  apartment?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Chicago' })
  city!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'IL' })
  state!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '60601' })
  zip!: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, required: false })
  isDefault?: boolean;
}

export class UpdateCustomerAddressDto extends PartialType(
  CreateCustomerAddressDto,
) {}
