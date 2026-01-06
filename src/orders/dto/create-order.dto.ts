import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @IsUUID()
  @IsNotEmpty()
  serviceId!: string;

  @IsUUID()
  @IsOptional()
  addressId?: string;

  // Removing address string as schema now uses addressId relation
  // @IsString()
  // @IsOptional()
  // address?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Usually amount is calculated from service base price, but allow override
  @IsNumber()
  @IsOptional()
  amount?: number;
}
