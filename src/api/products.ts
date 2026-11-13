// ─── Products API client — mirrors the backend contract 1:1 ──────────────────
// Endpoints (see tokkiweb-backend API_CONTRACT §1):
//   GET    /products                    public
//   POST   /products                    admin (Bearer)
//   PATCH  /products/:id                admin — partial update, `updated_row` quirk
//   DELETE /products/:id                admin — soft-archive, frees stock + image files
//   POST   /products/:id/images         admin — append gallery image (max 5),
//                                              multipart field "image", max 5 MB,
//                                              jpeg/png/webp; backend re-encodes to WebP
//   DELETE /products/:id/images?url=    admin — remove one gallery image, reindexes
//   PUT    /products/:id/images/order   admin — full reorder; first url = cover
//   POST   /products/:id/image          admin — LEGACY: replaces the cover
//   DELETE /products/:id/image          admin — LEGACY: removes the cover
// Image URLs arrive pre-built as absolute `product_image_url` (backend
// PUBLIC_BASE_URL) or relative `/images/...` — render them directly.
// `product_image_urls` is the ordered gallery (index 0 = cover);
// `product_image_url` mirrors `product_image_urls[0]`.

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
  product_image_urls?: string[];
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
    product_image_urls: row.product_image_urls ?? undefined,
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

export interface GalleryPayload {
  product_id: number;
  product_image_urls?: string[];
  product_image_url?: string | null;
}

/** Appends one image to the product gallery (max 5 — backend 409s beyond the cap). */
export async function addProductImage(
  productId: number,
  file: File,
  auth?: AdminAuth,
): Promise<ApiResult<GalleryPayload>> {
  const form = new FormData();
  form.append('image', file);
  return api<GalleryPayload>(`/products/${productId}/images`, {
    method: 'POST',
    body: form,
    getToken: auth?.getToken,
  });
}

/** Removes one gallery image by URL; the next image becomes the cover when the cover is removed. */
export async function removeProductImageByUrl(
  productId: number,
  url: string,
  auth?: AdminAuth,
): Promise<ApiResult<GalleryPayload>> {
  return api<GalleryPayload>(
    `/products/${productId}/images?url=${encodeURIComponent(url)}`,
    { method: 'DELETE', getToken: auth?.getToken },
  );
}

/** Full gallery reorder — the first URL becomes the cover. Must match the current set exactly. */
export async function reorderProductImages(
  productId: number,
  urls: string[],
  auth?: AdminAuth,
): Promise<ApiResult<GalleryPayload>> {
  return api<GalleryPayload>(`/products/${productId}/images/order`, {
    method: 'PUT',
    body: JSON.stringify({ urls }),
    headers: { 'Content-Type': 'application/json' },
    getToken: auth?.getToken,
  });
}
