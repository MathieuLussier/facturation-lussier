import type {
  Client as DbClient,
  Contact as DbContact,
  Invoice as DbInvoice,
  InvoiceAttachment as DbAttachment,
  InvoiceLine as DbLine,
  Project as DbProject,
} from '@prisma/client';
import type {
  Client,
  Contact,
  Invoice,
  InvoiceAttachment,
  InvoiceLine,
  InvoiceStatus,
  PaymentMethod,
  Project,
  ProjectStatus,
} from '@facturation/core';

type DbProjectWithContacts = DbProject & { billingContacts?: DbContact[] };

/** Ligne de facture Prisma enrichie de ses relations (client/lignes/pièces/projet/contact). */
export type InvoiceRow = DbInvoice & {
  lines?: DbLine[];
  attachments?: DbAttachment[];
  client?: DbClient | null;
  project?: DbProjectWithContacts | null;
  billingContact?: DbContact | null;
};

/** `include` complet à joindre pour reconstruire une facture de détail. */
export const INCLUDE_FULL = {
  client: true,
  lines: { orderBy: { position: 'asc' as const } },
  attachments: { orderBy: { createdAt: 'asc' as const } },
  project: { include: { billingContacts: true } },
  billingContact: true,
};

function toClient(c: DbClient): Client {
  return {
    id: c.id,
    type: c.type,
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
    archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
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

function toAttachment(a: DbAttachment): InvoiceAttachment {
  return {
    id: a.id,
    invoiceId: a.invoiceId,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt.toISOString(),
  };
}

function toContact(c: DbContact): Contact {
  return {
    id: c.id,
    companyId: c.companyId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    title: c.title,
    isBillingContact: c.isBillingContact,
    notes: c.notes,
    archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toProject(p: DbProjectWithContacts): Project {
  return {
    id: p.id,
    companyId: p.companyId,
    name: p.name,
    status: p.status as ProjectStatus,
    notes: p.notes,
    billingContacts: (p.billingContacts ?? []).map(toContact),
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Mappe une ligne Prisma (avec relations) vers le type `Invoice` partagé. */
export function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    number: row.number,
    reference: row.reference ?? null,
    sequenceYear: row.sequenceYear ?? null,
    sequenceNo: row.sequenceNo ?? null,
    status: row.status as InvoiceStatus,
    clientId: row.clientId,
    client: row.client ? toClient(row.client) : undefined,
    projectId: row.projectId,
    project: row.project ? toProject(row.project) : undefined,
    billingContactId: row.billingContactId,
    billingContact: row.billingContact ? toContact(row.billingContact) : undefined,
    issueDate: row.issueDate.toISOString(),
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    notes: row.notes,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    paymentMethod: (row.paymentMethod as PaymentMethod | null) ?? null,
    subtotalCents: row.subtotalCents,
    gstCents: row.gstCents,
    qstCents: row.qstCents,
    totalCents: row.totalCents,
    lines: (row.lines ?? []).map(toLine),
    attachments: row.attachments ? row.attachments.map(toAttachment) : undefined,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    deletable: row.status === 'BROUILLON',
    editable: row.status === 'BROUILLON' || row.status === 'ENVOYEE',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
