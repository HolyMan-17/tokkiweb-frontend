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
import {
  getCachedCatalog,
  invalidateCatalogCache,
  normalizeProductRow,
  setCachedCatalog,
  type ProductRow,
} from './catalogCache';
import type { Product } from '../types';

type AdminAuth = { getToken?: () => Promise<string | null> };

export interface CreateProductInput {
  product_name: string;
  product_price: number;
  discount_percent?: number;
  product_description: string;
  category: string;
  qty_available: number;
}

export interface UpdateProductInput {
  product_name?: string;
  product_price?: number;
  discount_percent?: number;
  product_description?: string;
  category?: string;
  qty_available?: number;
}

export interface FetchProductsOptions {
  useCache?: boolean;
}

declare global {
  interface Window {
    __TOKKI_PRODUCTS_PROMISE__?: Promise<unknown>;
  }
}

let inFlightCatalogPromise: Promise<Product[]> | null = null;

async function consumeBootstrappedProducts(): Promise<ApiResult<Product[]> | null> {
  if (typeof window === 'undefined' || !window.__TOKKI_PRODUCTS_PROMISE__) {
    return null;
  }
  const promise = window.__TOKKI_PRODUCTS_PROMISE__;
  delete window.__TOKKI_PRODUCTS_PROMISE__;

  if ((import.meta.env.VITE_API_URL ?? '/api') !== '/api') {
    return null;
  }

  try {
    const payload = (await promise) as {
      success?: boolean | string;
      data?: ProductRow[];
      message?: string;
    } | null;
    if (
      payload &&
      typeof payload === 'object' &&
      (payload.success === true || payload.success === 'true') &&
      Array.isArray(payload.data)
    ) {
      return {
        ok: true,
        data: payload.data.map(normalizeProductRow),
        message: payload.message,
        status: 200,
      };
    }
  } catch {
    // Ignore bootstrap errors and fall back to standard API call.
  }

  return null;
}

async function withCacheInvalidation<T>(
  request: Promise<ApiResult<T>>,
): Promise<ApiResult<T>> {
  const result = await request;
  if (result.ok) invalidateCatalogCache();
  return result;
}

/** Public catalog read. Empty catalog resolves to an empty array. */
export async function listProducts(): Promise<ApiResult<Product[]>> {
  const bootstrapped = await consumeBootstrappedProducts();
  if (bootstrapped) return bootstrapped;

  const result = await api<ProductRow[]>('/products');
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data?.map(normalizeProductRow) ?? [],
    message: result.message,
    status: result.status,
  };
}

/** Page-facing loader: deduplicates concurrent requests and populates the
 *  short-lived catalog cache. Pass `{ useCache: true }` when a fresh snapshot
 *  within the TTL is sufficient. */
export async function fetchAllProducts(
  options?: FetchProductsOptions,
): Promise<Product[]> {
  if (options?.useCache) {
    const cached = getCachedCatalog();
    if (cached) return cached;
  }

  if (inFlightCatalogPromise) {
    return inFlightCatalogPromise;
  }

  inFlightCatalogPromise = listProducts()
    .then((result) => {
      if (!result.ok) throw new Error(result.message);
      const rows = result.data ?? [];
      setCachedCatalog(rows);
      return rows;
    })
    .finally(() => {
      inFlightCatalogPromise = null;
    });

  return inFlightCatalogPromise;
}

export async function getProduct(
  productId: number,
): Promise<ApiResult<Product>> {
  const result = await api<ProductRow>(`/products/${productId}`);
  if (!result.ok) return result;
  return {
    ok: true,
    data: normalizeProductRow(result.data),
    message: result.message,
    status: result.status,
  };
}

export async function createProduct(
  input: CreateProductInput,
  auth?: AdminAuth,
): Promise<ApiResult<Product>> {
  return withCacheInvalidation(
    api<ProductRow>('/products', {
      method: 'POST',
      body: JSON.stringify(input),
      getToken: auth?.getToken,
    }) as Promise<ApiResult<Product>>,
  );
}

export async function updateProduct(
  productId: number,
  patch: UpdateProductInput,
  auth?: AdminAuth,
): Promise<ApiResult<Product>> {
  return withCacheInvalidation(
    api<ProductRow>(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
      getToken: auth?.getToken,
    }) as Promise<ApiResult<Product>>,
  );
}

export async function archiveProduct(
  productId: number,
  auth?: AdminAuth,
): Promise<ApiResult<unknown>> {
  return withCacheInvalidation(
    api(`/products/${productId}`, { method: 'DELETE', getToken: auth?.getToken }),
  );
}

/** Multipart upload — field MUST be named "image" (backend multer config). */
export async function uploadProductImage(
  productId: number,
  file: File,
  auth?: AdminAuth,
): Promise<ApiResult<{ product_image_url?: string | null }>> {
  const form = new FormData();
  form.append('image', file);
  return withCacheInvalidation(
    api<{ product_image_url?: string | null }>(`/products/${productId}/image`, {
      method: 'POST',
      body: form,
      getToken: auth?.getToken,
    }),
  );
}

export async function removeProductImage(
  productId: number,
  auth?: AdminAuth,
): Promise<ApiResult<unknown>> {
  return withCacheInvalidation(
    api(`/products/${productId}/image`, { method: 'DELETE', getToken: auth?.getToken }),
  );
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
  return withCacheInvalidation(
    api<GalleryPayload>(`/products/${productId}/images`, {
      method: 'POST',
      body: form,
      getToken: auth?.getToken,
    }),
  );
}

/** Removes one gallery image by URL; the next image becomes the cover when the cover is removed. */
export async function removeProductImageByUrl(
  productId: number,
  url: string,
  auth?: AdminAuth,
): Promise<ApiResult<GalleryPayload>> {
  return withCacheInvalidation(
    api<GalleryPayload>(
      `/products/${productId}/images?url=${encodeURIComponent(url)}`,
      { method: 'DELETE', getToken: auth?.getToken },
    ),
  );
}

/** Full gallery reorder — the first URL becomes the cover. Must match the current set exactly. */
export async function reorderProductImages(
  productId: number,
  urls: string[],
  auth?: AdminAuth,
): Promise<ApiResult<GalleryPayload>> {
  return withCacheInvalidation(
    api<GalleryPayload>(`/products/${productId}/images/order`, {
      method: 'PUT',
      body: JSON.stringify({ urls }),
      headers: { 'Content-Type': 'application/json' },
      getToken: auth?.getToken,
    }),
  );
}
