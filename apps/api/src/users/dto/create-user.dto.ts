import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { Role } from '@facturation/core';

export class CreateUserDto {
  @IsEmail({}, { message: "L'adresse email est invalide" })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password!: string;

  @IsIn(['ADMIN', 'MEMBER'], { message: 'Le rôle doit être ADMIN ou MEMBER' })
  role!: Role;
}
