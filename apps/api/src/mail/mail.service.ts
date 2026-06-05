import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  body: string;
  pdfBuffer: Buffer;
  attachmentName: string;
}

/**
 * Envoi de courriels via SMTP (Nodemailer). La configuration est lue dans les
 * variables d'environnement SMTP_* ; en leur absence, l'envoi est désactivé et
 * lève une erreur claire (503) plutôt que de planter au démarrage.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('SMTP_FROM') ?? 'Facturation Lussier <no-reply@localhost>';

    if (!host) {
      this.transporter = null;
      this.logger.warn("SMTP_HOST non défini — l'envoi de courriels est désactivé.");
      return;
    }

    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(config.get<string>('SMTP_PORT') ?? 587),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      ...(user ? { auth: { user, pass } } : {}),
    });
  }

  /** Indique si un transport SMTP est configuré (utilisé pour valider avant d'agir). */
  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /** Envoie un courriel avec la facture en pièce jointe (PDF). */
  async sendInvoiceEmail(opts: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        "L'envoi de courriels n'est pas configuré (SMTP). Renseignez les variables SMTP_* dans .env.",
      );
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        text: opts.body,
        attachments: [
          { filename: opts.attachmentName, content: opts.pdfBuffer, contentType: 'application/pdf' },
        ],
      });
    } catch (err) {
      this.logger.error(
        `Échec d'envoi du courriel à ${opts.to}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new ServiceUnavailableException(
        "Impossible d'envoyer le courriel. Vérifiez la configuration SMTP.",
      );
    }
  }
}
