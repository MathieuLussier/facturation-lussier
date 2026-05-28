import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@facturation/core';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(): Promise<AuthUser[]> {
    const users = await this.prisma.client.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => this.authService.toAuthUser(u));
  }

  async findById(id: string): Promise<AuthUser> {
    const user = await this.prisma.client.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Utilisateur introuvable : ${id}`);
    }

    return this.authService.toAuthUser(user);
  }

  async create(dto: CreateUserDto): Promise<AuthUser> {
    return this.authService.createUser({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      role: dto.role,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<AuthUser> {
    const existing = await this.prisma.client.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Utilisateur introuvable : ${id}`);
    }

    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const conflict = await this.prisma.client.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });

      if (conflict) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }
    }

    const updated = await this.prisma.client.user.update({
      where: { id },
      data: {
        ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.authService.toAuthUser(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.client.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Utilisateur introuvable : ${id}`);
    }

    await this.prisma.client.user.delete({ where: { id } });
  }
}
