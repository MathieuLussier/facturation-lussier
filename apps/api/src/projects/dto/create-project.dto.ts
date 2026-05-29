import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1, { message: "L'identifiant de l'entreprise est requis" })
  companyId!: string;

  @IsString()
  @MinLength(1, { message: 'Le nom du projet est requis' })
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsIn(['ACTIF', 'TERMINE'], { message: 'Le statut doit être ACTIF ou TERMINE' })
  status?: 'ACTIF' | 'TERMINE';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsArray({ message: 'billingContactIds doit être un tableau' })
  @IsString({ each: true, message: 'Chaque identifiant de contact doit être une chaîne' })
  billingContactIds?: string[];
}
