import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthUser, Invoice, InvoiceStats, Paginated, SendInvoiceResponse } from '@facturation/core';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IssuerService } from '../issuer/issuer.service';
import { MailService } from '../mail/mail.service';
import { InvoicesService } from './invoices.service';
import { InvoiceMailingService } from './invoice-mailing.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQuery } from './dto/list-invoices.query';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly mailing: InvoiceMailingService,
    private readonly issuer: IssuerService,
    private readonly pdf: InvoicePdfService,
    private readonly mail: MailService,
  ) {}

  @Get()
  list(@Query() query: ListInvoicesQuery): Promise<Paginated<Invoice>> {
    return this.invoices.list(query);
  }

  // Doit rester AVANT @Get(':id') sinon « stats » serait capturé comme un id.
  @Get('stats')
  stats(): Promise<InvoiceStats> {
    return this.invoices.stats();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Invoice> {
    return this.invoices.findById(id);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const invoice = await this.invoices.findById(id);
    const issuer = await this.issuer.get();
    const buffer = await this.pdf.generate(invoice, issuer);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${invoice.reference ?? invoice.number}.pdf"`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser): Promise<Invoice> {
    return this.invoices.create(dto, user.id);
  }

  // Envoi par courriel : limité à 3 par minute par IP (anti-abus). Le
  // @UseGuards(ThrottlerGuard) est requis pour que @Throttle soit effectif
  // (le ThrottlerGuard n'est pas enregistré globalement).
  @Post(':id/send')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  send(@Param('id') id: string, @Body() dto: SendInvoiceDto): Promise<SendInvoiceResponse> {
    return this.mailing.sendInvoice(id, dto, this.pdf, this.issuer, this.mail);
  }

  @Post(':id/remind')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  remind(@Param('id') id: string, @Body() dto: SendInvoiceDto): Promise<{ sent: boolean }> {
    return this.mailing.sendReminder(id, dto, this.pdf, this.issuer, this.mail);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto): Promise<Invoice> {
    return this.invoices.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto): Promise<Invoice> {
    return this.invoices.updateStatus(id, dto.status, dto.paidAt, dto.paymentMethod);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string): Promise<Invoice> {
    return this.invoices.archive(id);
  }

  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string): Promise<Invoice> {
    return this.invoices.unarchive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.invoices.remove(id);
  }
}
