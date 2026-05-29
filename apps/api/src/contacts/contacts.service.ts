import { Injectable, NotFoundException } from '@nestjs/common';
import type { Contact as DbContact } from '@prisma/client';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

/** Mappe une ligne Prisma vers le type partagé (dates en ISO). */
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string): Promise<Contact[]> {
    const rows = await this.prisma.client.contact.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
    return rows.map(toContact);
  }

  async findById(id: string): Promise<Contact> {
    const row = await this.prisma.client.contact.findUnique({ where: { id } });
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
    await this.prisma.client.contact.delete({ where: { id } });
  }
}
