# Tokki Shop — Frontend 🐰

Kawaii-themed online store frontend for **Tokki Shop** (Asian-inspired products: makeup, skincare, accessories, contact lenses, pins, clothing, Asian sweets) targeting a young Venezuelan / LatAm audience.

**Aesthetic:** "Korean kawaii × streetwear sticker" — pastel-pink surfaces, chunky rounded shapes, soft tinted shadows, playful micro-interactions.

## Stack

- React 19 + TypeScript + Vite
- react-router-dom v7 (SPA)
- Vanilla CSS (design system in `src/index.css`), no Tailwind / CSS-in-JS
- Fonts: **DynaPuff** (display) + **Sour Gummy** (body), self-hosted via `@fontsource`
- Clerk (admin auth), recharts (admin dashboard), motion (optional orchestration)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # add VITE_CLERK_PUBLISHABLE_KEY (admin only)
pnpm dev                     # http://localhost:5173 (proxies /api → :3000)
```

Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test:run`, `pnpm doctor`, `pnpm preview`.

## Current state (live API backend wired)

The shop is fully wired to the live PostgreSQL backend API (`/api/products`, `/api/orders`, `/api/orders/receipt/:token`):
- **Storefront & Catalog:** autorouted category carousels and whole-inventory browser loading live products.
- **Cart & Checkout:** persistent cart with live pre-submit stock reconciliation, country-aware phone validation, mandatory Cédula (`V` / `E` / `J` / `G` + 6-9 digits), and unguessable `order_token` UUID confirmation redirection.
- **Admin Panel:** Clerk Bearer authenticated product CRUD with multi-part WebP image uploads and order management with live Cédula/Phone display, one-click WhatsApp chat links, and instant approval/cancellation.

## Layout & routing

- Customer storefront: `/` (catalog), `/categorias/:slug`, `/productos` (all products), `/products/:id`, `/cart`, `/checkout`, `/confirmation/:orderToken`
- Admin panel (hidden path): `/tokki-admin` — dashboard, orders, products, dev tools; guarded by Clerk roles
- All paths live in `src/lib/routes.ts` — never hardcode route strings
- Admin pages are lazy-loaded; deployed to Vercel with SPA and reverse-proxy `/api` rewrites (`vercel.json`)

## Docs & Guidelines

- `AGENTS.md` — primary agent guidelines, mandatory skills (`frontend-design`, `react-doctor`), design system tokens, TDD rules
- `INTEGRATION_AUDIT.md` — full audit history, API contract checklists, and integration progress logs
- `FRONTEND_REQUIREMENTS.md` — functional requirements & API contract specifications