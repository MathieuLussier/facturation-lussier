import { Module } from '@nestjs/common';
import { IssuerModule } from '../issuer/issuer.module';
import { MailModule } from '../mail/mail.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  imports: [IssuerModule, MailModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
