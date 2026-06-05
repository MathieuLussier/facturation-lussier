import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import type { IssuerProfile } from '@facturation/core';
import { Roles } from '../auth/decorators/roles.decorator';
import { IssuerService } from './issuer.service';
import { UpsertIssuerDto } from './dto/upsert-issuer.dto';

// Formats supportés par le rendu PDF (PDFKit) : PNG et JPEG.
const ALLOWED_LOGO_EXT = ['.png', '.jpg', '.jpeg'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 Mo

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

  // Téléversement du logo (ADMIN) — stocké sur disque sous ./uploads, servi via /uploads.
  @Post('logo')
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          cb(null, `logo-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_LOGO_EXT.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Format de logo non supporté. Utilisez PNG ou JPG.'), false);
        }
      },
      limits: { fileSize: MAX_LOGO_BYTES },
    }),
  )
  async uploadLogo(@UploadedFile() file: Express.Multer.File): Promise<IssuerProfile> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    return this.issuer.updateLogo(`uploads/${file.filename}`);
  }
}
