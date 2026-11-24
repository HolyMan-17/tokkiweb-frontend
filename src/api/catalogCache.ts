import type { Product } from '../types';

export const CATALOG_CACHE_TTL_MS = 60_000;

export interface ProductRow {
  product_id: number;
  product_name: string;
  product_price: string | number;
  product_description: string;
  category: string;
  qty_available: number;
  in_stock: boolean;
  product_image_url?: string | null;
  product_image_urls?: string[];
}

export function normalizeProductRow(row: ProductRow): Product {
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

let cachedProducts: Product[] | null = null;
let cachedAt = 0;

export function getCachedCatalog(now = Date.now()): Product[] | null {
  if (!cachedProducts) return null;
  if (now - cachedAt >= CATALOG_CACHE_TTL_MS) {
    cachedProducts = null;
    cachedAt = 0;
    return null;
  }
  return cachedProducts;
}

export function getCachedProductById(productId: number, now = Date.now()): Product | undefined {
  return getCachedCatalog(now)?.find((product) => product.product_id === productId);
}

export function setCachedCatalog(products: Product[], now = Date.now()): void {
  cachedProducts = products;
  cachedAt = now;
}

export function invalidateCatalogCache(): void {
  cachedProducts = null;
  cachedAt = 0;
}
