import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Client as DbClient } from '@prisma/client';
import type {
  Client,
  CreateClientRequest,
  DirectoryEntry,
  Paginated,
  UpdateClientRequest,
} from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

/** Extension de la ligne Prisma pour inclure les compteurs de relations. */
type ClientRow = DbClient & {
  _count?: { invoices: number; contacts: number; projects: number };
};

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** true → uniquement les archivés ; sinon → uniquement les actifs. */
  archivedOnly?: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/** Include des compteurs de relations (pour calcul de deletable). */
const COUNT_INCLUDE = {
  _count: { select: { invoices: true, contacts: true, projects: true } },
} as const;

/** Mappe une ligne Prisma vers le type partagé (dates en ISO). */
function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    type: row.type,
    companyName: row.companyName,
    email: row.email,
    phone: row.phone,
    addressLine: row.addressLine,
    city: row.city,
    province: row.province,
    postalCode: row.postalCode,
    country: row.country,
    neq: row.neq,
    contactName: row.contactName,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    ...(row._count !== undefined && {
      deletable:
        row._count.invoices === 0 &&
        row._count.contacts === 0 &&
        row._count.projects === 0,
    }),
  };
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams): Promise<Paginated<Client>> {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const db = this.prisma.client;

    // Filtre de recherche textuelle
    const searchFilter = params.search
      ? { companyName: { contains: params.search, mode: 'insensitive' as const } }
      : {};

    // Filtre d'archivage : par défaut les actifs ; archivedOnly → uniquement les archivés
    const archivedFilter = params.archivedOnly ? { archivedAt: { not: null } } : { archivedAt: null };

    const where = { ...searchFilter, ...archivedFilter };

    const [rows, total] = await db.$transaction([
      db.client.findMany({
        where,
        orderBy: { companyName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: COUNT_INCLUDE,
      }),
      db.client.count({ where }),
    ]);

    return { items: rows.map(toClient), total, page, pageSize };
  }

  /**
   * Annuaire unifié : entreprises + particuliers (Client) + contacts rattachés,
   * trié par nom, filtré par recherche/archivage, paginé en mémoire.
   */
  async directory(params: ListParams): Promise<Paginated<DirectoryEntry>> {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const db = this.prisma.client;
    const archived = params.archivedOnly ? { archivedAt: { not: null } } : { archivedAt: null };
    const search = params.search?.trim();

    const clientWhere = {
      ...archived,
      ...(search ? { companyName: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const contactWhere = {
      ...archived,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [clients, contacts] = await Promise.all([
      db.client.findMany({ where: clientWhere }),
      db.contact.findMany({
        where: contactWhere,
        include: { company: { select: { companyName: true } } },
      }),
    ]);

    const entries: DirectoryEntry[] = [
      ...clients.map((c) => ({
        kind: (c.type === 'INDIVIDUAL' ? 'individual' : 'company') as DirectoryEntry['kind'],
        id: c.id,
        name: c.companyName,
        subtitle: [c.city, c.email].filter(Boolean).join(' · ') || null,
        companyId: null,
        archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
      })),
      ...contacts.map((ct) => ({
        kind: 'contact' as const,
        id: ct.id,
        name: ct.name,
        subtitle: ct.company.companyName,
        companyId: ct.companyId,
        archivedAt: ct.archivedAt ? ct.archivedAt.toISOString() : null,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    const start = (page - 1) * pageSize;
    return { items: entries.slice(start, start + pageSize), total: entries.length, page, pageSize };
  }

  async findById(id: string): Promise<Client> {
    const row = await this.prisma.client.client.findUnique({
      where: { id },
      include: COUNT_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Client introuvable');
    }
    return toClient(row);
  }

  async create(data: CreateClientRequest, createdById: string): Promise<Client> {
    const row = await this.prisma.client.client.create({
      data: { ...data, createdById },
    });
    return toClient(row);
  }

  async update(id: string, data: UpdateClientRequest): Promise<Client> {
    await this.findById(id); // 404 si absent
    const row = await this.prisma.client.client.update({
      where: { id },
      data,
      include: COUNT_INCLUDE,
    });
    return toClient(row);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // 404 si absent

    const [invoiceCount, contactCount, projectCount] = await Promise.all([
      this.prisma.client.invoice.count({ where: { clientId: id } }),
      this.prisma.client.contact.count({ where: { companyId: id } }),
      this.prisma.client.project.count({ where: { companyId: id } }),
    ]);

    if (invoiceCount > 0 || contactCount > 0 || projectCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer cette entreprise : ${invoiceCount} facture(s), ${contactCount} contact(s), ${projectCount} projet(s) rattachés. Archivez-la plutôt.`,
      );
    }

    await this.prisma.client.client.delete({ where: { id } });
  }

  async archive(id: string): Promise<Client> {
    await this.findById(id); // 404 si absent
    const row = await this.prisma.client.client.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: COUNT_INCLUDE,
    });
    return toClient(row);
  }

  async unarchive(id: string): Promise<Client> {
    await this.findById(id); // 404 si absent
    const row = await this.prisma.client.client.update({
      where: { id },
      data: { archivedAt: null },
      include: COUNT_INCLUDE,
    });
    return toClient(row);
  }
}
