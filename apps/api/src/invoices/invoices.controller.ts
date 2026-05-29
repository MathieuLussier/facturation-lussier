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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser, Invoice, Paginated } from '@facturation/core';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQuery } from './dto/list-invoices.query';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@Query() query: ListInvoicesQuery): Promise<Paginated<Invoice>> {
    return this.invoices.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Invoice> {
    return this.invoices.findById(id);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser): Promise<Invoice> {
    return this.invoices.create(dto, user.id);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto): Promise<Invoice> {
    return this.invoices.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.invoices.remove(id);
  }
}
