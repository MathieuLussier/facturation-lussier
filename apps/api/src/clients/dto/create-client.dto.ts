import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type { ClientType } from '@facturation/core';

export class CreateClientDto {
  @IsOptional()
  @IsIn(['COMPANY', 'INDIVIDUAL'], { message: 'Le type doit être COMPANY ou INDIVIDUAL' })
  type?: ClientType;

  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(255)
  companyName!: string;

  // Courriel : obligatoire pour un particulier (INDIVIDUAL) ; optionnel pour une
  // société, mais doit rester valide s'il est fourni.
  @ValidateIf(
    (o) => o.type === 'INDIVIDUAL' || (o.email !== undefined && o.email !== null && o.email !== ''),
  )
  @IsNotEmpty({ message: 'Le courriel est requis pour un particulier' })
  @IsEmail({}, { message: "L'adresse email est invalide" })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  neq?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
