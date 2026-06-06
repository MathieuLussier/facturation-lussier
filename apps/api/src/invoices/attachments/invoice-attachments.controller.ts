import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import type { InvoiceAttachment } from '@facturation/core';
import { InvoiceAttachmentsService } from './invoice-attachments.service';
import { RenameAttachmentDto } from './dto/rename-attachment.dto';
import { ATTACHMENTS_DIR, decodeOriginalName, ensureAttachmentsDir } from './attachment-storage';

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15 Mo

@ApiTags('Invoice attachments')
@Controller('invoices/:invoiceId/attachments')
export class InvoiceAttachmentsController {
  constructor(private readonly attachments: InvoiceAttachmentsService) {}

  @Get()
  list(@Param('invoiceId') invoiceId: string): Promise<InvoiceAttachment[]> {
    return this.attachments.list(invoiceId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureAttachmentsDir();
          cb(null, ATTACHMENTS_DIR);
        },
        filename: (_req, file, cb) => {
          cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_ATTACHMENT_BYTES },
    }),
  )
  async upload(
    @Param('invoiceId') invoiceId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<InvoiceAttachment[]> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    return this.attachments.add(invoiceId, {
      fileName: decodeOriginalName(file.originalname),
      storedName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Patch(':attId')
  rename(
    @Param('invoiceId') invoiceId: string,
    @Param('attId') attId: string,
    @Body() dto: RenameAttachmentDto,
  ): Promise<InvoiceAttachment[]> {
    return this.attachments.rename(invoiceId, attId, dto.fileName);
  }

  @Delete(':attId')
  remove(
    @Param('invoiceId') invoiceId: string,
    @Param('attId') attId: string,
  ): Promise<InvoiceAttachment[]> {
    return this.attachments.remove(invoiceId, attId);
  }

  @Get(':attId/download')
  async download(
    @Param('invoiceId') invoiceId: string,
    @Param('attId') attId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { absPath, fileName } = await this.attachments.getForDownload(invoiceId, attId);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Fichier introuvable');
    }
    res.download(absPath, fileName);
  }
}
