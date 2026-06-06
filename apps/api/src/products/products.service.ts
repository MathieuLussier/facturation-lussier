import { Injectable, NotFoundException } from '@nestjs/common';
import type { Product as DbProduct } from '@prisma/client';
import type {
  CreateProductRequest,
  Paginated,
  Product,
  UpdateProductRequest,
} from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** true → uniquement les archivés ; sinon → uniquement les actifs. */
  archivedOnly?: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
/** Plafond de l'autocomplete (liste plate, sans pagination). */
const ACTIVE_LIMIT = 200;

function toProduct(row: DbProduct): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unitPriceCents: row.unitPriceCents,
    unit: row.unit,
    isActive: row.isActive,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams): Promise<Paginated<Product>> {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const db = this.prisma.client;

    const searchFilter = params.search
      ? { name: { contains: params.search, mode: 'insensitive' as const } }
      : {};
    const archivedFilter = params.archivedOnly ? { archivedAt: { not: null } } : { archivedAt: null };
    const where = { ...searchFilter, ...archivedFilter };

    const [rows, total] = await db.$transaction([
      db.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.product.count({ where }),
    ]);

    return { items: rows.map(toProduct), total, page, pageSize };
  }

  /** Liste plate des produits actifs (catalogue d'autocomplete sur le formulaire de facture). */
  async listActive(search?: string): Promise<Product[]> {
    const rows = await this.prisma.client.product.findMany({
      where: {
        isActive: true,
        archivedAt: null,
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { name: 'asc' },
      take: ACTIVE_LIMIT,
    });
    return rows.map(toProduct);
  }

  async findById(id: string): Promise<Product> {
    const row = await this.prisma.client.product.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Produit introuvable');
    }
    return toProduct(row);
  }

  async create(data: CreateProductRequest): Promise<Product> {
    const row = await this.prisma.client.product.create({ data });
    return toProduct(row);
  }

  async update(id: string, data: UpdateProductRequest): Promise<Product> {
    await this.findById(id); // 404 si absent
    const row = await this.prisma.client.product.update({ where: { id }, data });
    return toProduct(row);
  }

  async archive(id: string): Promise<Product> {
    await this.findById(id);
    const row = await this.prisma.client.product.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return toProduct(row);
  }

  async unarchive(id: string): Promise<Product> {
    await this.findById(id);
    const row = await this.prisma.client.product.update({
      where: { id },
      data: { archivedAt: null },
    });
    return toProduct(row);
  }

  /**
   * Suppression définitive. Sans danger pour les factures : les lignes
   * conservent leur propre instantané (description + prix), aucune clé étrangère.
   */
  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.client.product.delete({ where: { id } });
  }
}
