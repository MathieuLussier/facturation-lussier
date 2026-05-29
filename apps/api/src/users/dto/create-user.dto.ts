import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import type { Role } from '@facturation/core';

export class CreateUserDto {
  @IsEmail({}, { message: "L'adresse email est invalide" })
  @MaxLength(255)
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128)
  password!: string;

  @IsIn(['ADMIN', 'MEMBER'], { message: 'Le rôle doit être ADMIN ou MEMBER' })
  role!: Role;
}
