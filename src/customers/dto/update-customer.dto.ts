import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['email'] as const),
) {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '123 Main St', required: false })
  addressLine?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Apt 4B', required: false })
  apartment?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Chicago', required: false })
  city?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'IL', required: false })
  state?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '60601', required: false })
  zip?: string;
}
