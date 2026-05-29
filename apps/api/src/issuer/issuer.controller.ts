import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { IssuerProfile } from '@facturation/core';
import { Roles } from '../auth/decorators/roles.decorator';
import { IssuerService } from './issuer.service';
import { UpsertIssuerDto } from './dto/upsert-issuer.dto';

@ApiTags('Issuer')
@Controller('issuer')
export class IssuerController {
  constructor(private readonly issuer: IssuerService) {}

  // Lecture : tout utilisateur authentifié (en-tête de facture, écran de paramètres).
  @Get()
  get(): Promise<IssuerProfile | null> {
    return this.issuer.get();
  }

  // Écriture : ADMIN uniquement.
  @Put()
  @Roles('ADMIN')
  upsert(@Body() dto: UpsertIssuerDto): Promise<IssuerProfile> {
    return this.issuer.upsert(dto);
  }
}
