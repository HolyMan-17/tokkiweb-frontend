// ─── Route definitions — single source of truth for paths ────────────────────
// Every internal link/redirect must use these, so the customer storefront and
// the hidden admin panel can never drift apart.

import { ADMIN_PATH } from './auth';

// ─── Customer storefront ───────────────────────────────────
export const ROUTES = {
  home: '/',
  allProducts: '/productos',
  category: (slug: string) => `/categorias/${slug}`,
  product: (id: number) => `/products/${id}`,
  cart: '/cart',
  checkout: '/checkout',
  confirmation: '/confirmation',
} as const;

// ─── Admin panel (hidden path) ─────────────────────────────
export const ADMIN_ROUTES = {
  root: ADMIN_PATH,
  signIn: `${ADMIN_PATH}/sign-in`,
  dev: `${ADMIN_PATH}/dev`,
  orders: `${ADMIN_PATH}/orders`,
  orderDetail: (id: number) => `${ADMIN_PATH}/orders/${id}`,
  products: `${ADMIN_PATH}/products`,
} as const;