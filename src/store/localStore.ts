// ─── LocalStorage store — test harness for the full shop flow ──────────────
// Simulates a backend using localStorage so the entire flow can be tested
// before wiring the real API. Seeded from the mock data on first run; every
// mutation persists and notifies subscribers so all pages stay in sync.

import { useSyncExternalStore } from 'react';
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_ORDER_DETAIL } from '../mock/data';
import type { Product, OrderDetail, OrderSummary, CartItem } from '../types';

const PRODUCTS_KEY = 'tokki_products_v1';
const ORDERS_KEY = 'tokki_orders_v1';
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
let ordersCache: OrderDetail[] | null = null;

function toSummary(o: OrderDetail): OrderSummary {
  return {
    order_id: o.order_id,
    name: o.client.name,
    last_name: o.client.last_name,
    tlf_num: o.client.tlf_num,
    total_amount: o.total_amount,
    status: o.status,
    item_count: o.items.reduce((s, i) => s + i.product_qty, 0),
    created_at: o.created_at,
  };
}

// Seed orders as full OrderDetail records. Order 1 reuses the rich mock
// detail; the rest get plausible line items derived from the product list.
function seedOrders(): OrderDetail[] {
  return MOCK_ORDERS.map(o => {
    if (o.order_id === MOCK_ORDER_DETAIL.order_id) {
      return { ...MOCK_ORDER_DETAIL, items: [...MOCK_ORDER_DETAIL.items] };
    }
    const items = Array.from({ length: Math.max(1, o.item_count) }, (_, i) => {
      const p = MOCK_PRODUCTS[i % MOCK_PRODUCTS.length];
      return {
        product_name: p.product_name,
        product_qty: 1,
        product_price: p.product_price,
        product_total: p.product_price,
      };
    });
    const total = items.reduce((s, it) => s + Number(it.product_total), 0);
    return {
      order_id: o.order_id,
      status: o.status,
      client: { name: o.name, last_name: o.last_name, tlf_num: o.tlf_num },
      total_amount: total.toFixed(2),
      created_at: o.created_at,
      items,
    };
  });
}

function ensureSeeded() {
  if (localStorage.getItem(PRODUCTS_KEY) === null) {
    write(PRODUCTS_KEY, MOCK_PRODUCTS);
  }
  if (localStorage.getItem(ORDERS_KEY) === null) {
    write(ORDERS_KEY, seedOrders());
  }
}

function loadProducts(): Product[] {
  ensureSeeded();
  if (productsCache === null) {
    productsCache = read(PRODUCTS_KEY, MOCK_PRODUCTS);
  }
  return productsCache;
}

function loadOrders(): OrderDetail[] {
  ensureSeeded();
  if (ordersCache === null) {
    ordersCache = read(ORDERS_KEY, seedOrders());
  }
  return ordersCache;
}

// ─── React hooks ───────────────────────────────────────────
export function useProducts(): Product[] {
  return useSyncExternalStore(subscribe, loadProducts, loadProducts);
}

export function useOrders(): OrderDetail[] {
  return useSyncExternalStore(subscribe, loadOrders, loadOrders);
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

// ─── Order mutations ───────────────────────────────────────
export function setOrderStatus(orderId: number, status: OrderDetail['status']) {
  const orders = loadOrders();
  const next = orders.map(o => (o.order_id === orderId ? { ...o, status } : o));
  ordersCache = next;
  write(ORDERS_KEY, next);
  notify();
}

export function getOrder(orderId: number): OrderDetail | undefined {
  return loadOrders().find(o => o.order_id === orderId);
}

export function getOrders(): OrderDetail[] {
  return loadOrders();
}

// Creates a pending order from the cart, decrements stock, and persists both.
export function createOrder(input: {
  client: { name: string; last_name: string; tlf_num: string };
  items: CartItem[];
}): OrderDetail {
  const products = loadProducts();
  const orders = loadOrders();

  const orderItems = input.items.map(({ product, quantity }) => ({
    product_name: product.product_name,
    product_qty: quantity,
    product_price: product.product_price,
    product_total: (Number(product.product_price) * quantity).toFixed(2),
  }));

  const total = orderItems.reduce((s, i) => s + Number(i.product_total), 0);
  const maxId = orders.reduce((max, o) => Math.max(max, o.order_id), 0);

  const order: OrderDetail = {
    order_id: maxId + 1,
    status: 'pending',
    client: input.client,
    total_amount: total.toFixed(2),
    created_at: new Date().toISOString(),
    items: orderItems,
  };

  const nextProducts = products.map(p => {
    const line = input.items.find(i => i.product.product_id === p.product_id);
    if (!line) return p;
    const qty_available = Math.max(0, p.qty_available - line.quantity);
    return { ...p, qty_available, in_stock: qty_available > 0 };
  });

  ordersCache = [order, ...orders];
  productsCache = nextProducts;
  write(ORDERS_KEY, ordersCache);
  write(PRODUCTS_KEY, productsCache);
  notify();
  return order;
}

// ─── Cart persistence ──────────────────────────────────────
export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    const valid = new Set(loadProducts().map(p => p.product_id));
    return parsed.filter(i => valid.has(i.product.product_id));
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  write(CART_KEY, items);
}

export function toOrderSummary(o: OrderDetail): OrderSummary {
  return toSummary(o);
}