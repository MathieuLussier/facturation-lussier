import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: "L'adresse email est invalide" })
  @MaxLength(255)
  @IsNotEmpty()
  email!: string;

  // Pas de contrainte de longueur à la connexion : le mot de passe est validé
  // contre le hash stocké. Un mot de passe vide est autorisé (raccourci DEV côté service).
  @IsString()
  @MaxLength(128)
  password!: string;
}
