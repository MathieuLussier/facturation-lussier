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
import type { Contact } from '@facturation/core';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

// Routes protégées par le JwtAuthGuard global : tout utilisateur authentifié.
@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@Query('companyId') companyId: string): Promise<Contact[]> {
    return this.contacts.list(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Contact> {
    return this.contacts.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateContactDto): Promise<Contact> {
    return this.contacts.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto): Promise<Contact> {
    return this.contacts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.contacts.remove(id);
  }
}
