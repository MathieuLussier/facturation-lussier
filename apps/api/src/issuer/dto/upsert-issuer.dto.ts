import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertIssuerDto {
  @IsString()
  @MinLength(1, { message: 'La raison sociale est requise' })
  @MaxLength(255)
  legalName!: string;

  @IsOptional()
  @IsEmail({}, { message: "L'adresse email est invalide" })
  @MaxLength(255)
  email?: string;

  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) addressLine?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(120) province?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(120) country?: string;
  @IsOptional() @IsString() @MaxLength(50) gstNumber?: string;
  @IsOptional() @IsString() @MaxLength(50) qstNumber?: string;
}
