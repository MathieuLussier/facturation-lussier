import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class InvoiceLineInput {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsInt()
  @Min(0)
  unitPriceCents!: number;
}

export class CreateInvoiceDto {
  @IsString()
  @MinLength(1)
  clientId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  billingContactId?: string;

  @IsOptional()
  @IsISO8601()
  issueDate?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineInput)
  lines!: InvoiceLineInput[];
}
