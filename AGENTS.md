# Tokki Shop Frontend — Agent Guidelines

## Identity & Brand

**Tokki Shop** is a kawaii-themed online store selling Asian-inspired products (makeup, skincare, accessories, bracelets, contact lenses, pins, clothing, Asian sweets) to a young Venezuelan / LatAm audience. The brand mascot is a bunny (토끼 = "tokki" in Korean). All user-facing copy is in **Spanish**.

---

## Aesthetic Direction

The visual language is **"Korean kawaii × streetwear sticker"** — pastel-pink surfaces, chunky rounded shapes, soft tinted shadows, and playful micro-interactions. Every design decision should feel like a cute sticker sheet come to life.

### Color Palette (5-stop pink scale)

| Token   | Hex       | Role                                      |
|---------|-----------|--------------------------------------------|
| `--p1`  | `#fde4f2` | Page tints, light fills                    |
| `--p2`  | `#f9cee7` | Surface tints, borders at rest             |
| `--p3`  | `#f4b8da` | Hover borders, image fills, mid accents    |
| `--p4`  | `#eea1cd` | Active pills, hover ring                   |
| `--p5`  | `#e68bbe` | Primary CTA, prices, logo, badge bg        |

Accent colors: success green (`#4caf80`), warning amber (`#e8a44d`), danger red (`#e06b6b`). These are used for status badges and feedback — never as decorative colors.

The page background is `--color-bg: #fff0f7`. Cards and surfaces are white (`#ffffff`). Text is dark plum (`#3d1a2e`).

### Typography

| Role           | Font        | Weights  | Usage                             |
|----------------|-------------|----------|-----------------------------------|
| Display / H1–H4 | **DynaPuff** | 400–700  | Headings, buttons, prices, labels |
| Body / UI text  | **Sour Gummy** | 400–700  | Paragraphs, form inputs, descriptions |
| Brand wordmark  | **Fredoka** | —        | Reserved for logo accents only    |

Fallback stacks (declared in `src/index.css`): `--font-display: 'DynaPuff', 'Baloo 2', 'Fredoka'` and `--font-body: 'Sour Gummy', 'Quicksand'`. Baloo 2 / Quicksand / Fredoka remain as fallbacks only.

Fonts load locally via `@fontsource/*` packages (imported in `src/main.tsx`), NOT from Google Fonts CDN. Never use Inter, Roboto, Arial, or system fonts.

### Shape Language

- **Border radius:** generous — cards `20px`, buttons `9999px` (full pill), inputs `12px`
- **Borders:** chunky `2–2.5px solid` in `--p2` / `--p3`, not hairline 1px
- **Shadows:** tinted pink (`rgba(230,139,190,…)`) at various opacities, never neutral grey
- **Corners & shapes:** everything rounded, never sharp — this is a sticker shop, not a dashboard

### Motion & Interaction

- Hover effects use `cubic-bezier(.34, 1.56, .64, 1)` (spring overshoot) for that "squish" feel
- Cards translate up + slight rotate on hover (`translateY(-4px) rotate(-0.8deg)`)
- Entry animations: `slideUp` with staggered delays for lists
- Cart badge uses a `scale` pop keyframe on count changes
- Prefer CSS transitions/animations. Use the `motion` library (Framer Motion) for complex orchestration in React only when CSS is insufficient

---

## Architecture & Conventions

### Stack

- **React 19** + **TypeScript 6** + **Vite 8**
- **react-router-dom v7** (BrowserRouter)
- **Vanilla CSS** — one `.css` file per component, co-located in the same directory
- **No Tailwind, no CSS-in-JS, no styled-components**

### Project Structure

```
src/
├── api/client.ts          # Shared fetch wrapper (envelope normalization)
├── assets/                # Static images (hero.png, SVGs)
├── components/
│   ├── layout/            # CatalogTopNav, Header, Layout (+CSS each)
│   └── ui/                # ProductCard, QuantitySelector, StatusBadge,
│                          #   EmptyState, LoadingSpinner (+CSS each)
├── constants/index.ts     # Categories, delivery/payment options, country
│                          #   codes, formatPrice(), formatDate()
├── context/CartContext.tsx # React Context cart (add/update/remove/clear)
├── mock/data.ts           # Static dev data (MOCK_PRODUCTS, MOCK_ORDERS)
├── pages/
│   ├── catalog/           # CatalogPage (standalone, full-bleed carousels)
│   ├── category/          # CategoryPage (standalone, product grid)
│   ├── product/           # ProductDetailPage (Layout variant="customer")
│   ├── cart/              # CartPage
│   ├── checkout/          # CheckoutPage
│   ├── confirmation/      # OrderConfirmationPage
│   └── admin/
│       ├── orders/        # OrdersDashboardPage, OrderDetailPage
│       └── products/      # ProductManagementPage
├── types/index.ts         # Product, OrderSummary, OrderDetail, CartItem,
│                          #   CheckoutPayload, ApiResponse<T>
├── index.css              # Design system: tokens, reset, button/card/form/
│                          #   badge systems, animations, skeleton loader
├── main.tsx               # React root + font imports
└── App.tsx                # Route definitions
```

### File Naming

- Components: `PascalCase.tsx` + `PascalCase.css` (co-located)
- Utilities / data: `camelCase.ts`
- One component per file, default export + named export

### CSS Patterns

- All design tokens live in `:root` in `src/index.css` — **never hardcode** colors, fonts, radii, or shadows in component CSS. Always reference `var(--token)`.
- Component CSS files import nothing — they rely on the global cascade from `index.css`.
- Class naming is flat BEM-ish: `.product-card`, `.card-body`, `.card-name` (not nested SCSS).
- Responsive: mobile-first with `@media (min-width: 768px)` breakpoint for tablet/desktop.
- The catalog page is **full-bleed** (no `max-width` on the page wrapper). Inner content like headers can be width-capped. Carousels must always span 100% viewport.
- Other pages inside `<Layout>` are constrained by `--max-width` (480px mobile, 1200px desktop).

### Component Patterns

- Props are inline typed: `({ product }: { product: Product })` for simple components.
- Cart access via `useCart()` hook from `CartContext`.
- Links use react-router `<Link>` / `<NavLink>`, never `<a>` for internal nav.
- Icons are inline SVGs (no icon library). Keep stroke-based, `currentColor`, consistent `strokeWidth`.
- Prices arrive as **strings** from the backend (`"49.99"`). Use `formatPrice()` from constants for display. Use `Number(x)` for arithmetic.

### API Patterns

- All backend calls go through `api<T>(path, options)` from `src/api/client.ts`.
- The wrapper normalizes the backend's inconsistent envelope (`data` / `row` / `updated_row`, `success` as boolean or string).
- Returns a discriminated union: `{ ok: true; data: T }` | `{ ok: false; message: string }`.
- Vite proxies `/api` → `http://localhost:3000` (see `vite.config.ts`).

### Current State (Mock Data)

All pages currently render from static data in `src/mock/data.ts`. Backend integration is **not yet wired**. When connecting pages to the real API:
1. Replace `MOCK_*` imports with `useEffect` + `api()` calls
2. Add loading states (`<LoadingSpinner />`) and error handling
3. Pass real API response data via `navigate('/path', { state: { ... } })` where needed (e.g. checkout → confirmation)

---

## Categories

Defined in `src/constants/index.ts`. The catalog page auto-generates a carousel per category.

| Category            | Emoji | Product Examples                          |
|---------------------|-------|-------------------------------------------|
| Maquillaje          | 💄    | Lip balms, gloss, eyeshadow, tints, liner |
| Skincare            | 🧴    | Face masks, serums, eye patches, sunscreen|
| Accesorios          | 💎    | Chains, necklaces, rings, earrings, clips |
| Pulseras            | 📿    | Bracelets, bead sets, thread bracelets    |
| Lentes de Contacto  | 👁️    | Colored cosmetic contact lenses           |
| Pines               | 📌    | Enamel pins, pin sets                     |
| Ropa                | 👗    | Crop tops, socks, hats, kawaii sets       |
| Dulces Asiáticos    | 🍡    | Mochi, Pepero, Hi-Chew, Kit Kat, Ramune   |

To add a new category: add it to `CATEGORIES` in constants, add products with that `category` string in mock data, and the catalog page will auto-render a new carousel.

---

## Do's and Don'ts

### Do

- Use the pink palette tokens (`--p1` through `--p5`) for all decorative color
- Keep the sticker aesthetic: chunky borders, generous radius, pink-tinted shadows
- Write all user-facing text in Spanish (Venezuelan dialect where relevant)
- Co-locate CSS with its component
- Use `formatPrice()` and `formatDate()` from constants — never raw number formatting
- Make layouts full-width and responsive; carousels edge-to-edge
- Preserve existing comments and docstrings unless directly modifying that code

### Don't

- Don't use Tailwind, CSS modules, or styled-components
- Don't add new font families — stick to DynaPuff / Sour Gummy (Baloo 2 / Quicksand / Fredoka are fallbacks only)
- Don't use grey shadows — always tint with `rgba(230,139,190,...)`
- Don't hardcode `max-width` on full-bleed pages (catalog, category) that clips carousel content
- Don't use `overflow-x: clip` on containers that hold scrollable carousels
- Don't bypass the `api()` wrapper for backend calls
- Don't use English for UI copy (buttons, labels, empty states, etc.)
