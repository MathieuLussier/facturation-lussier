import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '@facturation/core';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

/** Compteurs de données créées par l'utilisateur (pour décider de la suppression). */
const ADMIN_INCLUDE = {
  _count: { select: { createdInvoices: true, createdClients: true } },
} as const;

type UserWithCount = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  _count: { createdInvoices: number; createdClients: number };
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /** Mappe une ligne (avec `_count`) vers la vue admin enrichie de `deletable`. */
  private toAdminUser(user: UserWithCount): AuthUser {
    return {
      ...this.authService.toAuthUser(user),
      deletable: user._count.createdInvoices === 0 && user._count.createdClients === 0,
    };
  }

  /**
   * Garantit qu'il restera au moins un ADMIN actif APRÈS l'opération visant
   * `targetId` (suppression, désactivation ou rétrogradation).
   */
  private async ensureNotLastActiveAdmin(targetId: string): Promise<void> {
    const otherActiveAdmins = await this.prisma.client.user.count({
      where: { role: 'ADMIN', isActive: true, id: { not: targetId } },
    });

    if (otherActiveAdmins === 0) {
      throw new ConflictException(
        'Action impossible : il doit rester au moins un administrateur actif.',
      );
    }
  }

  async findAll(): Promise<AuthUser[]> {
    const users = await this.prisma.client.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: ADMIN_INCLUDE,
    });

    return users.map((u) => this.toAdminUser(u));
  }

  async findById(id: string): Promise<AuthUser> {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      include: ADMIN_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur introuvable : ${id}`);
    }

    return this.toAdminUser(user);
  }

  async create(dto: CreateUserDto): Promise<AuthUser> {
    const created = await this.authService.createUser({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      role: dto.role,
    });
    // Un compte fraîchement créé n'a encore créé aucune donnée → supprimable.
    return { ...created, deletable: true };
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<AuthUser> {
    const existing = await this.prisma.client.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Utilisateur introuvable : ${id}`);
    }

    // Auto-protection : on ne peut pas se désactiver soi-même.
    if (dto.isActive === false && id === actorId) {
      throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte.');
    }

    // Dernier admin : ni désactiver ni rétrograder le dernier ADMIN actif.
    const wouldLoseAdmin =
      existing.role === 'ADMIN' &&
      existing.isActive &&
      (dto.isActive === false || (dto.role !== undefined && dto.role !== 'ADMIN'));
    if (wouldLoseAdmin) {
      await this.ensureNotLastActiveAdmin(id);
    }

    // Unicité du courriel.
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
      include: ADMIN_INCLUDE,
    });

    // Révoquer les sessions en cours si on vient de désactiver le compte.
    if (dto.isActive === false) {
      await this.authService.revokeUserTokens(id);
    }

    return this.toAdminUser(updated);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const existing = await this.prisma.client.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Utilisateur introuvable : ${id}`);
    }

    if (id === actorId) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte.');
    }

    if (existing.role === 'ADMIN' && existing.isActive) {
      await this.ensureNotLastActiveAdmin(id);
    }

    const [invoiceCount, clientCount] = await Promise.all([
      this.prisma.client.invoice.count({ where: { createdById: id } }),
      this.prisma.client.client.count({ where: { createdById: id } }),
    ]);

    if (invoiceCount > 0 || clientCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer cet utilisateur : il a créé ${invoiceCount} facture(s) et ${clientCount} entreprise(s). Désactivez-le plutôt.`,
      );
    }

    await this.prisma.client.user.delete({ where: { id } });
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const existing = await this.prisma.client.user.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Utilisateur introuvable : ${id}`);
    }

    await this.authService.setUserPassword(id, newPassword);
  }
}
