import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import type { Role } from '@facturation/core';

export class UpdateUserDto {
  @IsEmail({}, { message: "L'adresse email est invalide" })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(['ADMIN', 'MEMBER'], { message: 'Le rôle doit être ADMIN ou MEMBER' })
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
