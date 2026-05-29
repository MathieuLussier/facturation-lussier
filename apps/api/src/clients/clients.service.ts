import { Injectable, NotFoundException } from '@nestjs/common';
import type { Client as DbClient } from '@prisma/client';
import type {
  Client,
  CreateClientRequest,
  Paginated,
  UpdateClientRequest,
} from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/** Mappe une ligne Prisma vers le type partagé (dates en ISO). */
function toClient(row: DbClient): Client {
  return {
    id: row.id,
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
  };
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams): Promise<Paginated<Client>> {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = params.search
      ? { companyName: { contains: params.search, mode: 'insensitive' as const } }
      : {};
    const db = this.prisma.client;

    const [rows, total] = await db.$transaction([
      db.client.findMany({
        where,
        orderBy: { companyName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.client.count({ where }),
    ]);

    return { items: rows.map(toClient), total, page, pageSize };
  }

  async findById(id: string): Promise<Client> {
    const row = await this.prisma.client.client.findUnique({ where: { id } });
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
    const row = await this.prisma.client.client.update({ where: { id }, data });
    return toClient(row);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // 404 si absent
    await this.prisma.client.client.delete({ where: { id } });
  }
}
