import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { InvoiceStatus } from '@facturation/core';

export class ListInvoicesQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeArchived?: boolean;

  @IsOptional()
  @IsIn(['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'])
  status?: InvoiceStatus;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  overdue?: boolean;
}
