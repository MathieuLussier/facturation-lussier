import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import type { InvoiceStatus, PaymentMethod } from '@facturation/core';

const STATUSES: InvoiceStatus[] = ['BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE'];
const PAYMENT_METHODS: PaymentMethod[] = ['VIREMENT', 'CHEQUE', 'CARTE', 'COMPTANT', 'AUTRE'];

export class UpdateInvoiceStatusDto {
  @IsIn(STATUSES, { message: 'Statut invalide' })
  status!: InvoiceStatus;

  /** Date d'encaissement (ISO). Utilisée uniquement lorsque status === 'PAYEE'. */
  @IsOptional()
  @IsISO8601()
  paidAt?: string;

  /** Mode de paiement. Requis lorsque status === 'PAYEE'. */
  @IsOptional()
  @IsIn(PAYMENT_METHODS, { message: 'Mode de paiement invalide' })
  paymentMethod?: PaymentMethod;
}
