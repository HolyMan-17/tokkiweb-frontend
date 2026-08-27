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
├── assets/                # Brand gifs/images (hopping_bunny, cherry_blossom,
│                          #   category icons, logos, etc.)
├── components/
│   ├── auth/              # AdminAuth (AuthProvider), useAdminAuth,
│   │                      #   RequireRole, AdminAuthContext, AuthGate.css
│   ├── layout/            # CatalogTopNav, Header, Layout (+CSS each)
│   └── ui/                # ProductCard, QuantitySelector, StatusBadge,
│                          #   EmptyState, LoadingSpinner, ConfirmDialog,
│                          #   CategoryIcons (+CSS each)
├── constants/index.ts     # Categories, delivery/payment options, full
│                          #   country-code list (digits+hints+validation),
│                          #   formatPrice(), formatDate()
├── context/CartContext.tsx # React Context cart (add/update/remove/clear),
│                          #   persisted to localStorage
├── lib/
│   ├── auth.ts            # ADMIN_PATH (/tokki-admin), roles, Clerk config
│   └── routes.ts          # ROUTES + ADMIN_ROUTES — single source of truth
│                          #   for every path (no hardcoded strings in pages)
├── mock/data.ts           # Seed data (MOCK_PRODUCTS, MOCK_ORDERS) — used to
│                          #   prime localStorage on first run only
├── store/localStore.ts    # localStorage-backed data layer (products, orders,
│                          #   cart). Hooks: useProducts(), useOrders() +
│                          #   mutations (createOrder, setOrderStatus,
│                          #   saveProducts). Simulates the API before wiring.
├── pages/
│   ├── catalog/           # CatalogPage (standalone, full-bleed carousels,
│   │                      #   animated hero bg, brand logo + gifs)
│   ├── category/          # CategoryPage (standalone, product grid) +
│   │                      #   CategoryPage.css = shared browse styles
│   │                      #   (search/sort/stock/grid) reused by AllProductsPage
│   ├── products/          # AllProductsPage ("Ver más" for the Todos carousel,
│   │                      #   /productos — whole-inventory search/sort/filter)
│   ├── product/           # ProductDetailPage (Layout variant="customer")
│   ├── cart/              # CartPage
│   ├── checkout/          # CheckoutPage (country-aware phone validation)
│   ├── confirmation/      # OrderConfirmationPage (reads order via state)
│   └── admin/
│       ├── dashboard/     # AdminDashboardPage (recharts: bar + pie, top products)
│       ├── orders/        # OrdersDashboardPage, OrderDetailPage
│       │   └── create/    # AdminCreateOrderPage, AdminProductPicker (POS order creator)
│       ├── products/      # ProductManagementPage (CRUD modal + filters)
│       ├── devtools/      # DevToolsPage (tech role only)
│       └── signin/        # AdminSignInPage (Clerk, branded)
├── types/index.ts         # Product, OrderSummary, OrderDetail, CartItem,
│                          #   CheckoutPayload, ApiResponse<T>
├── index.css              # Design system: tokens, reset, button/card/form/
│                          #   badge systems, animations, skeleton loader
├── main.tsx               # React root + font imports + font preloading
└── App.tsx                # Route definitions (admin lazy-loaded)
```

### Routing

- All paths live in `src/lib/routes.ts` (`ROUTES` for the storefront, `ADMIN_ROUTES` for the panel). **Never hardcode** `/path` strings in pages/components — always use the helpers.
- Admin pages are `lazy()`-loaded inside a `<Suspense>` boundary so the recharts/admin bundle never ships to storefront visitors.
- Deployed to Vercel with SPA rewrites (`vercel.json`): every route rewrites to `/index.html` so deep links (including `/tokki-admin`) don't 404.
- The "Todos" carousel's "Ver más" links to `/productos` (`AllProductsPage`) — the whole-inventory browser. Category carousels link to their `/categorias/:slug` page. Both share the browse UI via `CategoryPage.css`; keep new browse classes namespaced with `category-` (Vite CSS is global — see the collision note in that file).

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
- Category emojis on the storefront are replaced by brand gifs/pngs — use the shared `CATEGORY_ICONS` map (`src/components/ui/CategoryIcons.tsx`), never hand-roll per page.
- Every confirmation pop-up uses the shared `<ConfirmDialog>` (`src/components/ui/ConfirmDialog.tsx`). Never use native `window.confirm()` / `window.alert()`.

### API Patterns

- All backend calls go through `api<T>(path, options)` from `src/api/client.ts`.
- The wrapper normalizes the backend's inconsistent envelope (`data` / `row` / `updated_row`, `success` as boolean or string).
- Returns a discriminated union: `{ ok: true; data: T }` | `{ ok: false; message: string }`.
- Vite proxies `/api` → `http://localhost:3000` (see `vite.config.ts`).

### Current State (backend wired)

Products AND orders are live from the backend API. Each domain has a thin client mirroring the contract 1:1 — `src/api/products.ts`, `src/api/orders.ts` — built on `api()` (`src/api/client.ts`, `ApiResult<T>` union). Admin mutations attach a Clerk Bearer token via `getAdminToken` (AdminAuthContext). Pages load through `useAsync` + thrown-error loaders (`fetchAllProducts`, `fetchOrderSummaries`, `fetchOrderDetail`, `fetchOrderReceipt`) and render `<LoadingSpinner>` / `<ErrorState>` / NotFoundError states.

- **Checkout Submission:** POSTs `CreateOrderPayload` / `CheckoutPayload` (client info with mandatory cédula `V-12345678`, `delivery_type`, `payment_method`, `items`), re-validates cart stock against the live catalog before submitting (blocking `<StockNotice>` review), and navigates to `/confirmation/:orderToken` using the unguessable `order_token` UUID returned by `POST /orders`.
- **Order Confirmation:** Reads `orderToken` from route params and loads receipt via `fetchOrderReceipt(orderToken)` (`GET /api/orders/receipt/:token`, public/unauthenticated), supporting page refresh and fallback router state.
- **Admin Orders & Detail:** `fetchOrderDetail(orderId, auth)` accesses `GET /api/orders/:id` with Clerk Bearer auth. Orders list features accessible full-card touch navigation to order details, Cédula/Phone display, delivery/payment chips, and direct one-click WhatsApp chat links (`getWhatsAppLink()`). Includes RFC 4180 UTF-8 BOM CSV export (`exportOrdersToCsv`).
- **Admin In-Store Order Creation (POS Mode):** Accessible at `/tokki-admin/orders/new` (`ADMIN_ROUTES.createOrder`). Features POS product catalog picker (`AdminProductPicker`) with real-time search, category filter chips, and stock limits; one-tap walk-in customer autofill (`⚡ Cliente en Mostrador`); full input sanitization and validation for names, cédula format (`V-12345678`), and phone numbers; delivery & payment method selectors; auto-approval option for immediate counter payment (`approveOrder`); and instant redirection to `OrderDetailPage`. Modularized with `CustomerFormCard`, `OrderSummaryCard`, and `useAdminOrderCreator` (100/100 React Doctor score).
- **Admin Dashboard Analytics:** Interactive timeframe filters (`Días`, `Semanas`, `Meses`), metric toggle (`Ingresos ($)` vs `Pedidos (#)`), and distribution breakdown (`Por Estado`, `Por Pago`, `Por Entrega`). Highlights top best-selling products (`topProducts.ts`) and direct link to low stock items (`/tokki-admin/products?stock=low`).
- **Delivery & Payment Labels:** `getDeliveryLabel(slug)` and `getPaymentLabel(slug)` in `src/constants/index.ts` handle case/separator variations, alias fallbacks (`delivery_method`, `payment_type`), and default to `"No especificado"`.
- **Status Badge:** `<StatusBadge status={...} />` safely defaults undefined/unknown status to `'pending'`.
- **Cart:** (`src/context/CartContext.tsx`) persists product snapshots to localStorage (`tokki_cart_v1`) — reconciled against the live catalog on cart mount and pre-submit.
- **Product cache in admin forms:** `src/store/localStore.ts` is slimmed to products cache + cart persistence. Mock seed data (`src/mock/data.ts`) is products-only for test fixtures.

---

## Skills & Quality Rules (Mandatory for Frontend Work)

All agents working on this codebase **must** adhere to the following skills and verification workflows:

### 1. `frontend-design` Skill
- **Sticker Sheet Aesthetic:** Pastel-pink scale (`--p1` to `--p5`), dark plum text (`#3d1a2e`), chunky `2–2.5px solid` borders, generous radius (cards `20px`, buttons `9999px`), pink-tinted drop shadows.
- **Typography:** `DynaPuff` (display/buttons/prices/labels) paired with `Sour Gummy` (body/forms/inputs). Local `@fontsource/*` only — never Google Fonts or system fonts.
- **Micro-Interactions & Spring Physics:** Hover effects use `cubic-bezier(.34, 1.56, .64, 1)`. Staggered reveals (`animationDelay`) for lists and cards.
- **No AI Slop / Generic Boilerplate:** No generic grey shadows, no bootstrap badges, no Tailwind/CSS-in-JS.

### 2. `react-doctor` Skill & ESLint Rules
- **React Diagnostics:** Run `pnpm doctor` (or `npx react-doctor@latest`) before finishing frontend work to prevent performance, accessibility, and architectural regressions (Target score: **100 / 100 Great**).
- **ESLint & Hooks:** Run `pnpm lint` (`eslint-plugin-react-hooks` flat config). Never suppress hook dependencies without explicit justification.
- **Component Hygiene:**
  - Hoist pure functions, validators, and static lookup maps to module scope.
  - Reset async loading state flags inside `try ... finally { setIsLoading(false); }`.
  - Never nest interactive focusable controls (no buttons/anchors inside `role="button"` or `<Link>` containers).
  - Memoize context provider values to prevent cascading re-renders.
  - Avoid bare array index keys where unique object attributes exist.

---

## Development Workflow (TDD)

All development **must** follow Test-Driven Development (Red → Green → Refactor):

1. **Red** — Before writing any production code, write a failing test that captures the expected behavior (component render/logic test, utility unit test, store mutation test).
2. **Green** — Write the minimal production code needed to make the test pass.
3. **Refactor** — Clean up both code and tests while keeping them green.

Rules:

- Never modify or add features without an accompanying test first; bug fixes start with a failing regression test that reproduces the bug.
- Run the full test suite (`pnpm test:run`), e2e visual tests (`pnpm test:e2e`), and build/lint (`pnpm build && pnpm lint`) before declaring any task complete — all tests must pass (currently **31 Vitest test files / 231 tests green** + **4 Playwright E2E suites green**).
- Tests live next to what they cover (`Foo.tsx` → `Foo.test.tsx`, co-located) using **Vitest** + **@testing-library/react**.
- Pure logic (validators, formatters, sanitizers, link generators) must be unit-tested directly; UI components get behavior tests (what the user sees/does), not snapshot-only tests.
- Do not weaken, skip, or delete existing tests to make a change pass — fix the code instead.

### Playwright E2E & Visual Testing Environment

Playwright is configured for browser rendering, layout spacing, accessibility, and visual verification:

- **Config File**: `playwright.config.ts`
- **Spec Directory**: `e2e/*.spec.ts` (isolated from Vitest via `exclude: ['**/e2e/**', ...]` in `vite.config.ts`).
- **Dedicated Port**: `5199` with `--strictPort` (prevents port collisions with local development servers on `5173`/`5174`).
- **WebServer Hook**:
  ```ts
  webServer: {
    command: 'pnpm dev --port 5199 --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
    env: {
      VITE_ADMIN_DEV_BYPASS: 'true',
    },
  }
  ```
- **In-Memory Auth Bypass Rule (CRITICAL for Agents)**:
  - When testing admin flows with Playwright, pass `VITE_ADMIN_DEV_BYPASS: 'true'` **strictly in-memory** via `webServer.env` or inline environment variables.
  - **NEVER** write or leave `VITE_ADMIN_DEV_BYPASS=true` in persistent `.env` or `.env.local` files on disk.
  - `AdminClerkProvider` and `Header` automatically honor the bypass flag without mounting `@clerk/*` during automated test runs.
- **API Mocking Pattern**:
  Mock backend endpoints within test specs using `page.route`:
  ```ts
  await page.route('**/api/orders', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [...],
      }),
    });
  });
  ```
- **Commands**:
  - Run all E2E tests: `pnpm test:e2e` (or `npx playwright test`)
  - Install browser binaries: `npx playwright install chromium`
- **Output Artifacts**: Screenshots and traces go to `test-results/` and `playwright-report/` (both ignored in `.gitignore`).

---

## Categories

Defined in `src/constants/index.ts`. The catalog page auto-generates a carousel per category. Each category has a brand asset (gif/png) in `CATEGORY_ICONS` (`src/components/ui/CategoryIcons.tsx`) shown instead of the emoji on the catalog, category page, and admin product filter chips.

| Category            | Emoji | Product Examples                          |
|---------------------|-------|-------------------------------------------|
| Maquillaje          | 💄    | Lip balms, gloss, eyeshadow, tints, liner |
| Skincare            | 🧴    | Face masks, serums, eye patches, sunscreen|
| Accesorios          | 💎    | Chains, necklaces, rings, earrings, clips |
| Lentes de Contacto  | 👁️    | Colored cosmetic contact lenses           |
| Pines & Chapas      | 📌    | Enamel pins, pin sets                     |
| Ropa                | 👗    | Crop tops, socks, hats, kawaii sets       |
| Dulces Asiáticos    | 🍡    | Mochi, Pepero, Hi-Chew, Kit Kat, Ramune   |
| Peluches y Figuras  | 🧸    | Plushies, anime figures, keychains        |
| Otros               | 🛍️    | Stickers, notebooks, totes                |

To add a new category: add it to `CATEGORIES` in constants, add products with that `category` string in mock data, and the catalog page will auto-render a new carousel.

## Phone numbers & WhatsApp (checkout & admin)

- `COUNTRY_CODES` in `src/constants/index.ts` covers ~90 countries with per-country E.164 national digit counts, placeholder hints, and leading-zero normalization.
- Helpers: `normalizePhoneNumber(country, raw)`, `validatePhoneNumber(country, raw)`, `getCountryHint(country)`.
- Checkout shows live E.164 preview chip and blocks submission with a branded toast on invalid input. Phone input includes guidance hint: `"Número para coordinar entrega y pago vía WhatsApp"`.
- Admin links: `getWhatsAppLink(phone, orderId, customerName)` in `src/utils/whatsapp.ts` generates direct one-click WhatsApp chat links (`https://wa.me/<digits>?text=...`) for instant communication with buyers.

---

## Do's and Don'ts

### Do

- Use the pink palette tokens (`--p1` through `--p5`) for all decorative color
- Keep the sticker aesthetic: chunky borders, generous radius, pink-tinted shadows
- Write all user-facing text in Spanish (Venezuelan dialect where relevant)
- Co-locate CSS with its component
- Use `formatPrice()` and `formatDate()` from constants — never raw number formatting
- Make layouts full-width and responsive; carousels edge-to-edge
- Run `pnpm doctor`, `pnpm lint`, and `pnpm test:run` on every feature/fix
- Preserve existing comments and docstrings unless directly modifying that code

### Don't

- Don't use Tailwind, CSS modules, or styled-components
- Don't add new font families — stick to DynaPuff / Sour Gummy (Baloo 2 / Quicksand / Fredoka are fallbacks only)
- Don't use grey shadows — always tint with `rgba(230,139,190,...)`
- Don't hardcode `max-width` on full-bleed pages (catalog, category) that clips carousel content
- Don't use `overflow-x: clip` on containers that hold scrollable carousels
- Don't bypass the `api()` wrapper for backend calls
- Don't use English for UI copy (buttons, labels, empty states, etc.)

---

## Auth & Admin Routing (Clerk)

- The admin panel lives under the hidden path `ADMIN_PATH` (`src/lib/auth.ts`, default `/tokki-admin`). The URL is security-by-obscurity only; real access control is Clerk.
- Clerk roles come from `user.publicMetadata.role`: `owner` (full admin) and `tech` (full admin + Dev Tools at `/tokki-admin/dev`).
- Auth is abstracted behind `useAdminAuth()` (`src/components/auth/useAdminAuth.ts`) + `<AuthProvider>` (`src/components/auth/AdminAuth.tsx`). Consumers NEVER call Clerk hooks directly, so the app also runs without Clerk (dev bypass via `VITE_ADMIN_DEV_BYPASS=true`).
- Guard sections with `<RequireRole roles={[...]}>` (`src/components/auth/RequireRole.tsx`).
- Env: `VITE_CLERK_PUBLISHABLE_KEY` (required in prod), `VITE_ADMIN_DEV_BYPASS` (dev only, never prod), `VITE_API_URL`, `VITE_PUBLIC_SITE_URL` (injected into `index.html` OG/canonical tags — required in Vercel for link previews; see `.env.example`).
- See `.env.example` for the shape. Never commit a real publishable key.
