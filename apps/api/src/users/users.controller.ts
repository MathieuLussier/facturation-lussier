import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@facturation/core';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users
  @Get()
  @ApiOperation({ summary: 'Lister tous les utilisateurs (ADMIN)' })
  findAll(): Promise<AuthUser[]> {
    return this.usersService.findAll();
  }

  // POST /users
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un utilisateur (ADMIN)' })
  create(@Body() dto: CreateUserDto): Promise<AuthUser> {
    return this.usersService.create(dto);
  }

  // GET /users/:id
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID (ADMIN)' })
  findOne(@Param('id') id: string): Promise<AuthUser> {
    return this.usersService.findById(id);
  }

  // PATCH /users/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur (ADMIN)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AuthUser> {
    return this.usersService.update(id, dto, actor.id);
  }

  // PATCH /users/:id/password — réinitialisation par un ADMIN
  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe d’un utilisateur (ADMIN)' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto): Promise<void> {
    return this.usersService.resetPassword(id, dto.password);
  }

  // DELETE /users/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un utilisateur (ADMIN)' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser): Promise<void> {
    return this.usersService.remove(id, actor.id);
  }
}
