import { Module } from '@nestjs/common';
import { IssuerModule } from '../issuer/issuer.module';
import { MailModule } from '../mail/mail.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceNumberingService } from './invoice-numbering.service';
import { InvoiceMailingService } from './invoice-mailing.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceAttachmentsController } from './attachments/invoice-attachments.controller';
import { InvoiceAttachmentsService } from './attachments/invoice-attachments.service';

@Module({
  imports: [IssuerModule, MailModule],
  controllers: [InvoicesController, InvoiceAttachmentsController],
  providers: [
    InvoicesService,
    InvoiceNumberingService,
    InvoiceMailingService,
    InvoicePdfService,
    InvoiceAttachmentsService,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
