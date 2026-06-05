import type {
  CreateProductRequest,
  Paginated,
  Product,
  UpdateProductRequest,
} from '@facturation/core';
import { apiFetch } from './api';

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Inclure les produits archivés (masqués par défaut). */
  includeArchived?: boolean;
}

/** Construit la query string pour GET /products. Pure, testable. */
export function buildProductsQuery(params: ListProductsParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.search && params.search.trim()) sp.set('search', params.search.trim());
  if (params.includeArchived) sp.set('includeArchived', 'true');
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function listProducts(params: ListProductsParams = {}): Promise<Paginated<Product>> {
  return apiFetch<Paginated<Product>>(`/products${buildProductsQuery(params)}`);
}

/** Catalogue des produits actifs (autocomplete du formulaire de facture). */
export function listActiveProducts(search?: string): Promise<Product[]> {
  const qs = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiFetch<Product[]>(`/products/active${qs}`);
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

export function createProduct(data: CreateProductRequest): Promise<Product> {
  return apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(data) });
}

export function updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/products/${id}`, { method: 'DELETE' });
}

export function archiveProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/archive`, { method: 'PATCH' });
}

export function unarchiveProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/unarchive`, { method: 'PATCH' });
}
