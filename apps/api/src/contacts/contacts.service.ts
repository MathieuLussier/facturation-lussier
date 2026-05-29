import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Contact as DbContact } from '@prisma/client';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

type DbContactWithCount = DbContact & {
  _count?: { invoices: number; projects: number };
};

/** Mappe une ligne Prisma vers le type partagé (dates en ISO). */
function toContact(row: DbContactWithCount): Contact {
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
    ...(row._count !== undefined
      ? { deletable: row._count.invoices === 0 && row._count.projects === 0 }
      : {}),
  };
}

const COUNT_INCLUDE = { _count: { select: { invoices: true, projects: true } } } as const;

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, includeArchived = false): Promise<Contact[]> {
    const rows = await this.prisma.client.contact.findMany({
      where: {
        companyId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: { name: 'asc' },
      include: COUNT_INCLUDE,
    });
    return rows.map(toContact);
  }

  async findById(id: string): Promise<Contact> {
    const row = await this.prisma.client.contact.findUnique({
      where: { id },
      include: COUNT_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException('Contact introuvable');
    }
    return toContact(row);
  }

  async create(data: CreateContactRequest): Promise<Contact> {
    // Vérifie que l'entreprise existe avant de créer
    const company = await this.prisma.client.client.findUnique({
      where: { id: data.companyId },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Entreprise introuvable');
    }

    const row = await this.prisma.client.contact.create({ data });
    return toContact(row);
  }

  async update(id: string, data: UpdateContactRequest): Promise<Contact> {
    await this.findById(id); // 404 si absent
    const row = await this.prisma.client.contact.update({ where: { id }, data });
    return toContact(row);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // 404 si absent

    const [invoiceCount, projectCount] = await Promise.all([
      this.prisma.client.invoice.count({ where: { billingContactId: id } }),
      this.prisma.client.project.count({ where: { billingContacts: { some: { id } } } }),
    ]);

    if (invoiceCount > 0 || projectCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer ce contact : référencé par ${invoiceCount} facture(s) et ${projectCount} projet(s). Archivez-le plutôt.`,
      );
    }

    await this.prisma.client.contact.delete({ where: { id } });
  }

  async archive(id: string): Promise<Contact> {
    await this.findById(id); // 404 si absent
    const row = await this.prisma.client.contact.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: COUNT_INCLUDE,
    });
    return toContact(row);
  }

  async unarchive(id: string): Promise<Contact> {
    await this.findById(id); // 404 si absent
    const row = await this.prisma.client.contact.update({
      where: { id },
      data: { archivedAt: null },
      include: COUNT_INCLUDE,
    });
    return toContact(row);
  }
}
