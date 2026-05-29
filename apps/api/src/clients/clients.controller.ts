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
import type { AuthUser, Client, Paginated } from '@facturation/core';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ListClientsQuery } from './dto/list-clients.query';
import { UpdateClientDto } from './dto/update-client.dto';

// Routes protégées par le JwtAuthGuard global : tout utilisateur authentifié.
@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(@Query() query: ListClientsQuery): Promise<Paginated<Client>> {
    return this.clients.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Client> {
    return this.clients.findById(id);
  }

  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser): Promise<Client> {
    return this.clients.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto): Promise<Client> {
    return this.clients.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.clients.remove(id);
  }
}
