import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Role } from '@facturation/core';

export class UpdateUserDto {
  @IsEmail({}, { message: "L'adresse email est invalide" })
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsIn(['ADMIN', 'MEMBER'], { message: 'Le rôle doit être ADMIN ou MEMBER' })
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
