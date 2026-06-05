import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';
import type { ConfigService } from '@nestjs/config';

jest.mock('nodemailer');

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const samplePayload = {
  to: 'client@example.com',
  subject: 'Facture',
  body: 'Bonjour',
  pdfBuffer: Buffer.from('pdf'),
  attachmentName: 'facture-1.pdf',
};

describe('MailService', () => {
  afterEach(() => jest.clearAllMocks());

  it('isConfigured = false et lève 503 si SMTP_HOST est absent', async () => {
    const svc = new MailService(makeConfig({}));
    expect(svc.isConfigured).toBe(false);
    await expect(svc.sendInvoiceEmail(samplePayload)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('envoie le courriel avec la pièce jointe PDF quand SMTP est configuré', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    const svc = new MailService(
      makeConfig({ SMTP_HOST: 'smtp.test', SMTP_USER: 'u', SMTP_PASS: 'p', SMTP_FROM: 'X <x@test>' }),
    );

    expect(svc.isConfigured).toBe(true);
    await svc.sendInvoiceEmail(samplePayload);

    expect(sendMail).toHaveBeenCalledTimes(1);
    const arg = sendMail.mock.calls[0][0];
    expect(arg.to).toBe('client@example.com');
    expect(arg.from).toBe('X <x@test>');
    expect(arg.attachments[0].filename).toBe('facture-1.pdf');
    expect(arg.attachments[0].contentType).toBe('application/pdf');
  });

  it('convertit une erreur SMTP en 503 (sans fuite du détail)', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('connexion refusée'));
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    const svc = new MailService(makeConfig({ SMTP_HOST: 'smtp.test' }));

    await expect(svc.sendInvoiceEmail(samplePayload)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
