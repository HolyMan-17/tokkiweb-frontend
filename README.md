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

Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm preview`.

## Current state (localStorage flow)

The full shop flow runs on a localStorage-backed data layer (`src/store/localStore.ts`) seeded from `src/mock/data.ts` on first run — browse catalog, cart, checkout, order creation, admin product CRUD and order approve/cancel all work end-to-end. Backend integration via `src/api/client.ts` is not wired yet.

To reset demo data, clear `tokki_products_v1` / `tokki_orders_v1` / `tokki_cart_v1` from localStorage.

## Layout & routing

- Customer storefront: `/` (catalog), `/categorias/:slug`, `/productos` (all products), `/products/:id`, `/cart`, `/checkout`, `/confirmation`
- Admin panel (hidden path): `/tokki-admin` — dashboard, orders, products, dev tools; guarded by Clerk roles
- All paths live in `src/lib/routes.ts` — never hardcode route strings
- Admin pages are lazy-loaded; deployed to Vercel with SPA rewrites (`vercel.json`)

## Docs

- `AGENTS.md` — agent guidelines, architecture, conventions, design system
- `FRONTEND_REQUIREMENTS.md` — functional requirements & API contract