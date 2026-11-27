import { api } from './client';
import { fetchAllProducts } from './products';
import {
  getCachedProductById,
  normalizeProductRow,
  type ProductRow,
} from './catalogCache';
import type { Product } from '../types';

declare global {
  interface Window {
    __TOKKI_INITIAL_PRODUCT__?: ProductRow;
  }
}

function consumeInitialProduct(productId: number): Product | null {
  if (typeof window === 'undefined') return null;
  const initial = window.__TOKKI_INITIAL_PRODUCT__;
  if (!initial || Number(initial.product_id) !== productId) return null;
  delete window.__TOKKI_INITIAL_PRODUCT__;
  return normalizeProductRow(initial);
}

/**
 * Loads a single product for the detail view:
 * 1) serves immediately from the warm in-memory catalog cache if populated,
 * 2) consumes one-shot SSR bootstrap payload if embedded by og-server for this ID,
 * 3) otherwise fetches GET /products/:id directly instead of downloading the full catalog,
 * 4) returns null immediately on 404,
 * 5) falls back to fetchAllProducts only on unexpected non-404 network/proxy failures.
 */
export async function fetchProductDetail(productId: number): Promise<Product | null> {
  if (!Number.isFinite(productId) || productId <= 0) return null;

  const cached = getCachedProductById(productId);
  if (cached) return cached;

  const bootstrapped = consumeInitialProduct(productId);
  if (bootstrapped) return bootstrapped;

  const res = await api<ProductRow>(`/products/${productId}`);
  if (res.ok && res.data) {
    return normalizeProductRow(res.data);
  }
  if (!res.ok && res.status === 404) {
    return null;
  }

  const all = await fetchAllProducts({ useCache: true });
  return all.find((product) => product.product_id === productId) ?? null;
}
