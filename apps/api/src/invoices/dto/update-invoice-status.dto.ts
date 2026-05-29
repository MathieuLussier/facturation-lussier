import { IsIn } from 'class-validator';
import type { InvoiceStatus } from '@facturation/core';

const STATUSES: InvoiceStatus[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];

export class UpdateInvoiceStatusDto {
  @IsIn(STATUSES, { message: 'Statut invalide' })
  status!: InvoiceStatus;
}
