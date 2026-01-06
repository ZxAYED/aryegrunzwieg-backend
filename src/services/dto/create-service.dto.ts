import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsNumber()
  @IsNotEmpty()
  basePrice!: number;

  @IsArray()
  @IsString({ each: true })
  commonIssues!: string[];
}
