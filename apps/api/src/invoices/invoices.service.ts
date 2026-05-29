import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Client as DbClient,
  Invoice as DbInvoice,
  InvoiceLine as DbLine,
} from '@prisma/client';
import {
  computeInvoiceTotals,
  computeLineAmountCents,
  type Client,
  type CreateInvoiceRequest,
  type Invoice,
  type InvoiceLine,
  type InvoiceStats,
  type InvoiceStatus,
  type Paginated,
} from '@facturation/core';
import { PrismaService } from '../prisma/prisma.service';

interface ListParams {
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

type InvoiceRow = DbInvoice & { lines?: DbLine[]; client?: DbClient | null };

const INCLUDE_FULL = {
  client: true,
  lines: { orderBy: { position: 'asc' as const } },
};

function toClient(c: DbClient): Client {
  return {
    id: c.id,
    companyName: c.companyName,
    email: c.email,
    phone: c.phone,
    addressLine: c.addressLine,
    city: c.city,
    province: c.province,
    postalCode: c.postalCode,
    country: c.country,
    neq: c.neq,
    contactName: c.contactName,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toLine(l: DbLine): InvoiceLine {
  return {
    id: l.id,
    description: l.description,
    quantity: l.quantity,
    unitPriceCents: l.unitPriceCents,
    amountCents: l.amountCents,
  };
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    status: row.status as InvoiceStatus,
    clientId: row.clientId,
    client: row.client ? toClient(row.client) : undefined,
    issueDate: row.issueDate.toISOString(),
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    notes: row.notes,
    subtotalCents: row.subtotalCents,
    gstCents: row.gstCents,
    qstCents: row.qstCents,
    totalCents: row.totalCents,
    lines: (row.lines ?? []).map(toLine),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams): Promise<Paginated<Invoice>> {
    const page = params.page ?? DEFAULT_PAGE;
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const db = this.prisma.client;

    const [rows, total] = await db.$transaction([
      db.invoice.findMany({
        orderBy: { number: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { client: true },
      }),
      db.invoice.count(),
    ]);

    return { items: rows.map(toInvoice), total, page, pageSize };
  }

  /** Agrégats pour le tableau de bord. */
  async stats(): Promise<InvoiceStats> {
    const db = this.prisma.client;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      countBrouillon,
      countEnvoyee,
      countPayee,
      countAnnulee,
      paid,
      outstanding,
      overdue,
      month,
      recentRows,
    ] = await db.$transaction([
      db.invoice.count({ where: { status: 'BROUILLON' } }),
      db.invoice.count({ where: { status: 'ENVOYEE' } }),
      db.invoice.count({ where: { status: 'PAYEE' } }),
      db.invoice.count({ where: { status: 'ANNULEE' } }),
      db.invoice.aggregate({ _sum: { totalCents: true }, where: { status: 'PAYEE' } }),
      db.invoice.aggregate({ _sum: { totalCents: true }, where: { status: 'ENVOYEE' } }),
      db.invoice.aggregate({
        _sum: { totalCents: true },
        _count: { _all: true },
        where: { status: 'ENVOYEE', dueDate: { lt: now } },
      }),
      db.invoice.aggregate({
        _sum: { totalCents: true },
        where: { status: { not: 'ANNULEE' }, issueDate: { gte: monthStart } },
      }),
      db.invoice.findMany({ orderBy: { number: 'desc' }, take: 5, include: { client: true } }),
    ]);

    const countByStatus: Record<InvoiceStatus, number> = {
      BROUILLON: countBrouillon,
      ENVOYEE: countEnvoyee,
      PAYEE: countPayee,
      ANNULEE: countAnnulee,
    };

    return {
      paidCents: paid._sum.totalCents ?? 0,
      outstandingCents: outstanding._sum.totalCents ?? 0,
      overdueCents: overdue._sum.totalCents ?? 0,
      overdueCount: overdue._count._all,
      currentMonthCents: month._sum.totalCents ?? 0,
      countByStatus,
      recent: recentRows.map(toInvoice),
    };
  }

  async findById(id: string): Promise<Invoice> {
    const row = await this.prisma.client.invoice.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!row) {
      throw new NotFoundException('Facture introuvable');
    }
    return toInvoice(row);
  }

  async create(data: CreateInvoiceRequest, createdById: string): Promise<Invoice> {
    const client = await this.prisma.client.client.findUnique({ where: { id: data.clientId } });
    if (!client) {
      throw new NotFoundException('Client introuvable');
    }

    const totals = computeInvoiceTotals(data.lines);

    const row = await this.prisma.client.invoice.create({
      data: {
        clientId: data.clientId,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes ?? null,
        subtotalCents: totals.subtotalCents,
        gstCents: totals.gstCents,
        qstCents: totals.qstCents,
        totalCents: totals.totalCents,
        createdById,
        lines: {
          create: data.lines.map((l, index) => ({
            description: l.description,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            amountCents: computeLineAmountCents(l.quantity, l.unitPriceCents),
            position: index,
          })),
        },
      },
      include: INCLUDE_FULL,
    });

    return toInvoice(row);
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    await this.findById(id);
    const row = await this.prisma.client.invoice.update({
      where: { id },
      data: { status },
      include: INCLUDE_FULL,
    });
    return toInvoice(row);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.client.invoice.delete({ where: { id } });
  }
}
