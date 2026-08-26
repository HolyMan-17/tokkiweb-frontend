// ─── Products API client — mirrors the backend contract 1:1 ──────────────────
// Endpoints (see tokkiweb-backend API_CONTRACT §1):
//   GET    /products              public
//   POST   /products              admin (Bearer)
//   PATCH  /products/:id          admin — partial update, `updated_row` quirk
//   DELETE /products/:id          admin — soft-archive, frees stock + image file
//   POST   /products/:id/image    admin — multipart field "image", max 5 MB,
//                                        jpeg/png/webp; backend re-encodes to WebP
//   DELETE /products/:id/image    admin — idempotent no-op when there is none
// Image URLs arrive pre-built as absolute `product_image_url` (backend
// PUBLIC_BASE_URL) or relative `/images/...` — render them directly.

import { api, type ApiResult } from './client';
import type { Product } from '../types';

type AdminAuth = { getToken?: () => Promise<string | null> };

interface ProductRow {
  product_id: number;
  product_name: string;
  product_price: string;
  product_description: string;
  category: string;
  qty_available: number;
  in_stock: boolean;
  product_image_url?: string | null;
}

export interface CreateProductInput {
  product_name: string;
  product_price: number;
  product_description: string;
  category: string;
  qty_available: number;
}

export interface UpdateProductInput {
  product_name?: string;
  product_price?: number;
  product_description?: string;
  category?: string;
  qty_available?: number;
}

function toProduct(row: ProductRow): Product {
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    product_price: String(row.product_price),
    product_description: row.product_description,
    category: row.category,
    qty_available: row.qty_available,
    in_stock: row.in_stock,
    product_image_url: row.product_image_url ?? undefined,
  };
}

/** Public catalog read. Empty catalog resolves to an empty array. */
export async function listProducts(): Promise<ApiResult<Product[]>> {
  const result = await api<ProductRow[]>('/products');
  if (!result.ok) return result;
  return { ok: true, data: result.data?.map(toProduct) ?? [], message: result.message, status: result.status };
}

/** Page-facing loader: rows or a thrown Error — pairs with useAsync +
 *  <ErrorState>, which renders thrown messages instead of envelope juggling. */
export async function fetchAllProducts(): Promise<Product[]> {
  const result = await listProducts();
  if (!result.ok) throw new Error(result.message);
  return result.data ?? [];
}

export async function getProduct(
  productId: number,
): Promise<ApiResult<Product>> {
  return api<ProductRow>(`/products/${productId}`) as Promise<ApiResult<Product>>;
}

export async function createProduct(
  input: CreateProductInput,
  auth?: AdminAuth,
): Promise<ApiResult<Product>> {
  return api<ProductRow>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
    getToken: auth?.getToken,
  }) as Promise<ApiResult<Product>>;
}

export async function updateProduct(
  productId: number,
  patch: UpdateProductInput,
  auth?: AdminAuth,
): Promise<ApiResult<Product>> {
  return api<ProductRow>(`/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    getToken: auth?.getToken,
  }) as Promise<ApiResult<Product>>;
}

export async function archiveProduct(
  productId: number,
  auth?: AdminAuth,
): Promise<ApiResult<unknown>> {
  return api(`/products/${productId}`, { method: 'DELETE', getToken: auth?.getToken });
}

/** Multipart upload — field MUST be named "image" (backend multer config). */
export async function uploadProductImage(
  productId: number,
  file: File,
  auth?: AdminAuth,
): Promise<ApiResult<{ product_image_url?: string | null }>> {
  const form = new FormData();
  form.append('image', file);
  return api<{ product_image_url?: string | null }>(`/products/${productId}/image`, {
    method: 'POST',
    body: form,
    getToken: auth?.getToken,
  });
}

export async function removeProductImage(
  productId: number,
  auth?: AdminAuth,
): Promise<ApiResult<unknown>> {
  return api(`/products/${productId}/image`, { method: 'DELETE', getToken: auth?.getToken });
}
