import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { InvoiceLineInput } from './create-invoice.dto';

/**
 * Édition du contenu d'une facture. Les champs d'en-tête sont optionnels mais
 * les lignes sont toujours fournies au complet (remplacement intégral).
 */
export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  clientId?: string;

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
