// ─── LocalStorage store — cart persistence ────────────────
// Products and orders now talk directly to the real backend via
// src/api/products.ts and src/api/orders.ts.
// This module handles client-side cart persistence across sessions.

import type { CartItem } from '../types';

const CART_KEY = 'tokki_cart_v1';

/**
 * Load cart items from localStorage.
 * Cart lines carry full product snapshots, so validation is structural.
 */
export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return parsed.filter(
      i =>
        i &&
        i.product &&
        Number.isFinite(i.product.product_id) &&
        typeof i.product.product_price === 'string' &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0,
    );
  } catch {
    return [];
  }
}

/**
 * Persist cart items to localStorage.
 */
export function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode — ignore */
  }
}
