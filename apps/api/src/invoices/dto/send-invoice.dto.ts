import { IsArray, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Envoi (ou rappel) d'une facture par courriel. Objet/message éditables côté UI. */
export class SendInvoiceDto {
  @IsEmail({}, { message: "L'adresse courriel du destinataire est invalide" })
  @MaxLength(255)
  to!: string;

  @IsString()
  @MinLength(1, { message: "L'objet est requis" })
  @MaxLength(255)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  /** Ids des pièces jointes à joindre. Absent = toutes. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}
