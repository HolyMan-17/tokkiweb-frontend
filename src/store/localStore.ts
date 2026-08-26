// ─── LocalStorage store — products cache + cart persistence ────────────────
// The orders domain now talks to the real backend via src/api/orders.ts.
// What remains here: the product catalog cache (seeded from the mock data on
// first run) and the cart lines, both persisted to localStorage with
// subscriber notifications so all pages stay in sync.

import { useSyncExternalStore } from 'react';
import { MOCK_PRODUCTS } from '../mock/data';
import type { Product, CartItem } from '../types';

const PRODUCTS_KEY = 'tokki_products_v1';
const CART_KEY = 'tokki_cart_v1';

// ─── Subscriptions ─────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach(fn => fn());
}

// ─── Low-level read/write ──────────────────────────────────
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

// ─── In-memory cache (referentially stable between mutations) ──
let productsCache: Product[] | null = null;

function ensureSeeded() {
  if (localStorage.getItem(PRODUCTS_KEY) === null) {
    write(PRODUCTS_KEY, MOCK_PRODUCTS);
  }
}

function loadProducts(): Product[] {
  ensureSeeded();
  if (productsCache === null) {
    productsCache = read(PRODUCTS_KEY, MOCK_PRODUCTS);
  }
  return productsCache;
}

// ─── React hooks ───────────────────────────────────────────
export function useProducts(): Product[] {
  return useSyncExternalStore(subscribe, loadProducts, loadProducts);
}

// ─── Product mutations ─────────────────────────────────────
export function saveProducts(next: Product[]) {
  productsCache = next;
  write(PRODUCTS_KEY, next);
  notify();
}

export function getProducts(): Product[] {
  return loadProducts();
}

// ─── Cart persistence ──────────────────────────────────────
// Cart lines carry full product snapshots (they may reference products that
// now live in the API rather than this store), so validation is structural.
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

export function saveCart(items: CartItem[]) {
  write(CART_KEY, items);
}
