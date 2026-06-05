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
import type { Paginated, Product } from '@facturation/core';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQuery } from './dto/list-products.query';
import { UpdateProductDto } from './dto/update-product.dto';

// Routes protégées par le JwtAuthGuard global : tout utilisateur authentifié.
@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: ListProductsQuery): Promise<Paginated<Product>> {
    return this.products.list(query);
  }

  // Liste plate des produits actifs (autocomplete) — AVANT @Get(':id').
  @Get('active')
  listActive(@Query('search') search?: string): Promise<Product[]> {
    return this.products.listActive(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Product> {
    return this.products.findById(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.products.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<Product> {
    return this.products.update(id, dto);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string): Promise<Product> {
    return this.products.archive(id);
  }

  @Patch(':id/unarchive')
  unarchive(@Param('id') id: string): Promise<Product> {
    return this.products.unarchive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.products.remove(id);
  }
}
