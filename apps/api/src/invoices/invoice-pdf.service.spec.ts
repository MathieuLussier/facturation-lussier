import 'reflect-metadata';
import { InvoicePdfService } from './invoice-pdf.service';
import type { Invoice, IssuerProfile } from '@facturation/core';

const invoice: Invoice = {
  id: 'inv1',
  number: 42,
  reference: 'FAC-2026-0042',
  sequenceYear: 2026,
  sequenceNo: 42,
  status: 'ENVOYEE',
  clientId: 'c1',
  projectId: null,
  billingContactId: null,
  client: {
    id: 'c1',
    type: 'COMPANY',
    companyName: 'Acme',
    email: 'a@acme.com',
    phone: null,
    addressLine: '1 rue Principale',
    city: 'Québec',
    province: 'QC',
    postalCode: 'G1A 1A1',
    country: 'Canada',
    neq: null,
    contactName: 'Jean Tremblay',
    notes: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  issueDate: '2026-02-01T00:00:00.000Z',
  dueDate: null,
  notes: 'Merci de votre confiance.',
  paidAt: null,
  paymentMethod: null,
  subtotalCents: 10000,
  gstCents: 500,
  qstCents: 998,
  totalCents: 11498,
  lines: [
    { id: 'l1', description: 'Consultation', quantity: 2, unitPriceCents: 5000, amountCents: 10000 },
  ],
  archivedAt: null,
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};

const issuer: IssuerProfile = {
  id: 'i1',
  legalName: 'Lussier inc.',
  email: 'info@lussier.test',
  phone: null,
  addressLine: null,
  city: null,
  province: 'QC',
  postalCode: null,
  country: 'Canada',
  gstNumber: '123456789RT0001',
  qstNumber: '1234567890TQ0001',
  logoPath: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('InvoicePdfService', () => {
  it('génère un buffer PDF valide', async () => {
    const buf = await new InvoicePdfService().generate(invoice, issuer);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('fonctionne même sans profil émetteur', async () => {
    const buf = await new InvoicePdfService().generate(invoice, null);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
