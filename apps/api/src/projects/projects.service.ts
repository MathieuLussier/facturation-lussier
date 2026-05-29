import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Contact as DbContact,
  Project as DbProject,
} from '@prisma/client';
import type { Contact, Project, CreateProjectRequest, UpdateProjectRequest } from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

type DbProjectWithContacts = DbProject & {
  billingContacts: DbContact[];
  _count?: { invoices: number };
};

/** Mappe une ligne Prisma Contact vers le type partagé. */
function toContact(row: DbContact): Contact {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    title: row.title,
    isBillingContact: row.isBillingContact,
    notes: row.notes,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Mappe une ligne Prisma Project (avec billingContacts) vers le type partagé. */
function toProject(row: DbProjectWithContacts): Project {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    status: row.status as 'ACTIF' | 'TERMINE',
    notes: row.notes,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    billingContacts: row.billingContacts.map(toContact),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row._count !== undefined ? { deletable: row._count.invoices === 0 } : {}),
  };
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId?: string, includeArchived?: boolean): Promise<Project[]> {
    const baseWhere = companyId ? { companyId } : {};
    const where = includeArchived ? baseWhere : { ...baseWhere, archivedAt: null };
    const rows = await this.prisma.client.project.findMany({
      where,
      include: {
        billingContacts: true,
        _count: { select: { invoices: true } },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(toProject);
  }

  async findById(id: string): Promise<Project> {
    const row = await this.prisma.client.project.findUnique({
      where: { id },
      include: {
        billingContacts: true,
        _count: { select: { invoices: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Projet introuvable');
    }
    return toProject(row);
  }

  async archive(id: string): Promise<Project> {
    const existing = await this.prisma.client.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Projet introuvable');
    }
    const row = await this.prisma.client.project.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: {
        billingContacts: true,
        _count: { select: { invoices: true } },
      },
    });
    return toProject(row);
  }

  async unarchive(id: string): Promise<Project> {
    const existing = await this.prisma.client.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Projet introuvable');
    }
    const row = await this.prisma.client.project.update({
      where: { id },
      data: { archivedAt: null },
      include: {
        billingContacts: true,
        _count: { select: { invoices: true } },
      },
    });
    return toProject(row);
  }

  async create(data: CreateProjectRequest): Promise<Project> {
    const company = await this.prisma.client.client.findUnique({
      where: { id: data.companyId },
    });
    if (!company) {
      throw new NotFoundException("Entreprise introuvable");
    }

    const contactIds = data.billingContactIds ?? [];
    if (contactIds.length > 0) {
      await this.validateBillingContacts(contactIds, data.companyId);
    }

    const row = await this.prisma.client.project.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        billingContacts: contactIds.length > 0
          ? { connect: contactIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        billingContacts: true,
        _count: { select: { invoices: true } },
      },
    });
    return toProject(row);
  }

  async update(id: string, data: UpdateProjectRequest): Promise<Project> {
    const existing = await this.prisma.client.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Projet introuvable');
    }

    if (data.billingContactIds !== undefined) {
      await this.validateBillingContacts(data.billingContactIds, existing.companyId);
    }

    const row = await this.prisma.client.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.billingContactIds !== undefined
          ? { billingContacts: { set: data.billingContactIds.map((cid) => ({ id: cid })) } }
          : {}),
      },
      include: {
        billingContacts: true,
        _count: { select: { invoices: true } },
      },
    });
    return toProject(row);
  }

  async remove(id: string): Promise<void> {
    const invoiceCount = await this.prisma.client.invoice.count({ where: { projectId: id } });
    if (invoiceCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer ce projet : ${invoiceCount} facture(s) y sont rattachée(s). Archivez-le plutôt.`,
      );
    }
    const existing = await this.prisma.client.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Projet introuvable');
    }
    await this.prisma.client.project.delete({ where: { id } });
  }

  /**
   * Valide que chaque contact existe, appartient à companyId,
   * et a isBillingContact = true.
   */
  private async validateBillingContacts(
    contactIds: string[],
    companyId: string,
  ): Promise<void> {
    if (contactIds.length === 0) return;

    const contacts = await this.prisma.client.contact.findMany({
      where: { id: { in: contactIds } },
    });

    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    for (const cid of contactIds) {
      const contact = contactMap.get(cid);
      if (!contact) {
        throw new BadRequestException(`Contact introuvable : ${cid}`);
      }
      if (contact.companyId !== companyId) {
        throw new BadRequestException(
          `Le contact ${cid} n'appartient pas à cette entreprise`,
        );
      }
      if (!contact.isBillingContact) {
        throw new BadRequestException(
          `Le contact ${cid} n'est pas un contact de facturation`,
        );
      }
    }
  }
}
