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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser, Invoice, InvoiceStats, Paginated } from '@facturation/core';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IssuerService } from '../issuer/issuer.service';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQuery } from './dto/list-invoices.query';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly issuer: IssuerService,
    private readonly pdf: InvoicePdfService,
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
      'Content-Disposition': `attachment; filename="facture-${invoice.number}.pdf"`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser): Promise<Invoice> {
    return this.invoices.create(dto, user.id);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto): Promise<Invoice> {
    return this.invoices.updateStatus(id, dto.status);
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
