# Tokki Shop Frontend — Pre-Integration Audit

**Created:** 2026-08-22 · **Status:** living document — update every item's checkbox and the Progress Log as we work through them.

Full codebase scan performed before wiring the real backend API (`FRONTEND_REQUIREMENTS.md` §4). Findings ordered by severity; each item lists where the issue lives, why it matters, and the proposed fix.

**Legend:** ☐ open · 🔄 in progress · ✅ done · ⏭️ deferred (with reason) · ❌ won't fix (with reason)

---

## 🔴 A. Integration blockers

### A1. `api/client.ts` not production-ready
- **Where:** `src/api/client.ts`
- **Problem:**
  - Hardcodes `const BASE = '/api'` and ignores `VITE_API_URL` (declared in `.env.example`; Dev Tools page displays a value that isn't actually used).
  - No `try/catch`: if the backend is down or returns HTML (502 page from Vercel/host), `res.json()` throws an unhandled exception instead of returning `{ ok: false }`.
  - Empty-envelope case (`{ success: "true", message }` with no `data`) resolves to `{ ok: true, data: undefined }` — callers must guard for `undefined`.
- **Fix:** read base URL from `import.meta.env.VITE_API_URL ?? '/api'`; wrap fetch+parse in try/catch → return `{ ok: false, message: 'No se pudo conectar con el servidor' }` on network/parse failure.
- **Status:** ☐

### A2. No production proxy for `/api`
- **Where:** `vercel.json`, `vite.config.ts`
- **Problem:** In dev, Vite proxies `/api/*` → `http://localhost:3000` so relative `fetch('/api/...')` works. In production there is no Vite dev server — Vercel serves static files and applies `vercel.json` rewrites. The catch-all rule `"/(.*)" → "/index.html"` also matches `/api/*` (nothing earlier matches), so **every production API call would receive the app's HTML with status 200**, then `res.json()` throws while parsing `<!doctype html>`.
- **Flow:**
  ```
  Dev:      fetch('/api/products') → Vite dev server → proxy → localhost:3000 → JSON ✅
  Prod now: fetch('/api/products') → Vercel rewrites → /index.html → HTML ❌
  Prod fix: fetch('/api/products') → Vercel rewrite /api/:path* → https://backend-host/api/:path* → JSON ✅
  ```
- **Fix:** add a same-origin reverse-proxy rewrite to the backend's public HTTPS URL **before** the catch-all:
  ```json
  { "source": "/api/:path*", "destination": "https://<backend-public-url>/api/:path*" }
  ```
  Keeping calls relative avoids CORS entirely (Vercel forwards server-side). Requires the backend to be deployed with a public URL first. Alternative: absolute URLs via `VITE_API_URL` + permissive CORS on the backend (more moving parts).
- **Status:** ☐

### A3. Checkout silently drops delivery type & payment method
- **Where:** `src/pages/checkout/CheckoutPage.tsx:89-96`, `src/store/localStore.ts` (`createOrder`)
- **Problem:** The form collects `deliveryType` and `paymentMethod`, but `createOrder()` is called with only `{ client, items }` — the two selections are never sent or persisted. `CheckoutPayload` in `src/types/index.ts` includes them; the local store signature doesn't match it.
- **Fix:** extend `createOrder` input to accept both fields; when wiring the API, include them in the `POST /api/orders` body per contract.
- **Resolution:** ✅ (2026-08-25) `createOrder` now accepts and persists `delivery_type` + `payment_method`; checkout sends the form selections through (`CheckoutPage.tsx`). Types updated (`OrderDetail.delivery_type` / `.payment_method`); seed orders carry plausible combos. At wire-up: pass both fields in the `POST /api/orders` body unchanged.
- **Status:** ✅

### A4. `category` missing from the backend contract
- **Where:** `src/types/index.ts` (Product), `src/constants/index.ts` (CATEGORIES)
- **Problem:** The entire storefront UX depends on `Product.category`, but the contract's `POST/PATCH /api/products` didn't accept it.
- **Resolution:** ✅ **Verified against backend code (2026-08-24)** — schema has `category VARCHAR(100) NOT NULL DEFAULT 'Otros'` (+ idempotent migration); GET list/single return it; POST requires it (trimmed string ≤100 chars); PATCH accepts it optionally and preserves otherwise; both mutations return it (`row` / `updated_row`). `API_CONTRACT.md` documents the convention: store the **display name exactly as in the frontend's `CATEGORIES`** (strict-equality matching), which matches how the storefront groups/filters (`p.category === category.name`). Bonus: `GET /api/products?category=` exact-match filter now exists (frontend doesn't need it — client-side filtering).
- **Known caveat:** backend accepts any string ≤100 chars (no allow-list validation). A product written outside the admin UI with an unexpected value would get no storefront carousel (still visible under "Todos" / `/productos`). Low risk: admin form is a closed `<select>` over `CATEGORIES`.
- **Status:** ✅

### A5. Product images wired to the backend implementation ✅
- **Where:** `src/api/products.ts` (new), `src/pages/admin/products/ProductManagementPage.tsx`, `src/types/index.ts`
- **Backend contract honored exactly:** multipart `POST /products/:id/image` (field `"image"`, max **5 MB**, jpeg/png/webp), idempotent `DELETE /products/:id/image`, `product_image_url` rendered directly, Bearer auth via Clerk `getToken`.
- **Resolution (2026-08-25):** new `src/api/products.ts` client (8 unit tests) covering list/create/update/archive/image-upload/image-delete incl. FormData boundary handling and error surfacing; `AdminAuthContext` extended with `getAdminToken`; admin form rewritten — File + object-URL preview (no more base64/localStorage), save chains create/update → upload, "Quitar" DELETEs persisted images, client-side limits mirror backend's; storefront browse pages + dashboard now read real API products (`fetchAllProducts` throwing-loader pattern paired with useAsync/ErrorState); cart persistence relaxed to structural validation so API-backed snapshots survive reloads; removed dead `localStore.fetchProducts`.
- **Runtime requirements:** backend running on `localhost:3000` (Vite proxy); **admin writes require Clerk** (`VITE_CLERK_PUBLISHABLE_KEY` + owner/tech session) — dev-bypass mode gets 401 by design since the backend has no bypass.
- **Status:** ✅

### A6. Zero loading/error states across the flow
- **Where:** every page reads synchronously via `useProducts()` / `useOrders()`
- **Problem:** `<LoadingSpinner />` and `<EmptyState />` exist in `src/components/ui/` but are **never used anywhere**. All pages assume synchronous local data. Once pages hit the network they need loading + error + retry states (see AGENTS.md → Current State checklist).
- **Fix:** during page-by-page wire-up, replace direct store reads with `useEffect` + `api()` and render `<LoadingSpinner />` while pending and an error state with retry on failure. Consider a tiny `useApi<T>` hook to avoid repeating boilerplate in ~10 places.
- **Resolution:** ✅ (2026-08-24) Shared infra shipped: `useAsync` hook (`src/hooks/useAsync.ts`), branded `ErrorState` component with retry, route-level `ErrorBoundary` wrapping every screen group in App.tsx, and async API-shaped facades in localStore (`fetchProducts`, `fetchOrderSummaries`, `fetchOrderDetail` with simulated 350 ms latency + `NotFoundError`). Integrated across all 9 data-driven screens; checkout submit wrapped in try/catch with error toast; confirmation page no longer fakes success without order state. At wire-up: swap facade bodies for `api()` calls — screen code unchanged.
- **Status:** ✅

### A7. `cedula` not in the backend order contract (NEW 2026-08-25)
- **Where:** checkout form (`CheckoutPage.tsx`), `OrderDetail` / `CheckoutPayload` types, admin `OrderDetailPage`
- **Problem:** The client form now collects cédula (`V-` / `E-` / `J-` + digits) and the frontend persists/surfaces it locally, but `POST /api/orders` and the clients schema don't accept or store it yet.
- **Fix:** backend adds `cedula VARCHAR(12)` (combined form `"V-12345678"`) to the client/order record + accepts/returns it in order endpoints; sync `API_CONTRACT.md`. Frontend is already sending it — no further changes expected at wire-up if the field round-trips.
- **Status:** ☐ *(backend action)*

---

## 🟠 B. Functional gaps

### B1. Confirmation page breaks on refresh; status hardcoded
- **Where:** `src/pages/confirmation/OrderConfirmationPage.tsx`
- **Problem:** Depends entirely on router state passed from checkout. Refreshing `/confirmation` shows "¡Pedido confirmado!" with order id "—" and a hardcoded "Pendiente" badge regardless of real status.
- **Fix:** change route to `/confirmation/:orderId` and fetch `GET /api/orders/:order_id` after wiring; derive the badge from actual status.
- **Status:** ☐

### B2. FR-7 unmet: customers cannot check order status
- **Where:** requirement `FRONTEND_REQUIREMENTS.md` §2.1 FR-7; no storefront page exists
- **Problem:** After checkout there is no way for a buyer to track their order (no lookup by phone/order id). Status badges only exist inside the admin panel.
- **Fix:** decide scope — e.g. a "Consultar pedido" page querying by order id (+ phone confirmation), powered by `GET /api/orders/:id`. Needs a product decision before building.
- **Status:** ☐

### B3. Cart never re-validates against current stock
- **Where:** `src/store/localStore.ts` (`loadCart` filters deleted products but doesn't clamp quantities), `src/context/CartContext.tsx` (clamps against the *snapshot* stored in each item)
- **Problem:** Cart persists product snapshots. If stock drops between sessions/orders, users can attempt to buy more than `qty_available`. Checkout would fail server-side with "Requested quantity is not available" with no friendly recovery path.
- **Fix:** on cart mount and before checkout, reconcile each line against fresh product data: clamp quantity, drop out-of-stock lines (with notice).
- **Status:** ☐

### B4. Dashboard bar chart uses fake data
- **Where:** `src/pages/admin/dashboard/AdminDashboardPage.tsx:10-18` (`MOCK_SALES_DATA`)
- **Problem:** Weekly sales chart is hardcoded. Pie chart + stat cards are already computed from real orders.
- **Fix:** compute sales-by-day from approved orders client-side (no new endpoint needed for a small shop).
- **Status:** ☐

### B5. Archived products are unrecoverable
- **Where:** `src/pages/admin/products/ProductManagementPage.tsx` (`confirmArchive` = hard delete locally); backend `DELETE /api/products/:id` soft-deletes but `GET /api/products` hides archived forever
- **Problem:** No way to list archived products or restore them under the current contract. Dialog even says "no se puede revertir".
- **Fix (decision needed):** acceptable if intended; otherwise backend needs a `GET /api/products?archived=true` + restore endpoint. Flag to backend team.
- **Status:** ☐

### B6. `item_count` semantics ambiguity
- **Where:** `src/store/localStore.ts` (`toSummary`) vs backend `c_orders.js`
- **Resolution:** ✅ **Defined by backend code (2026-08-25): LINES not units** — orders list uses `COUNT(o_i.product_id)` (one row per distinct product). Local sim summed quantities (units) and disagreed; fixed `toSummary` to `items.length` with a regression test (`localStore.test.ts`). Example: 2× hoodie + 3× pins → `item_count = 2`.
- **Status:** ✅

---

## 🟡 C. Minor bugs & polish

- ☐ **C1.** Toast timer leak — `ProductDetailPage.tsx:36` `setTimeout` not cleared on unmount (Checkout & Products do this correctly via refs).
- ☐ **C2.** Search inconsistency — category page searches name only; `/productos` searches name + description. Pick one behavior (name+description recommended).
- ☐ **C3.** `ConfirmDialog` lacks focus trap / Escape-to-close / focus restore (a11y).
- ☐ **C4.** Duplicated inline SVGs (cart, gear) between `Header.tsx` and `CatalogTopNav.tsx` — extract shared icon module.
- ☐ **C5.** Canceling an order locally doesn't restore stock (backend does) — demo-only divergence; remember when comparing behaviors after wiring.
- ☐ **C6.** Dev Tools page displays `VITE_API_URL` but client hardcodes `/api` — misleading until A1 lands.
- ☐ **C7.** No branded 404 — silent redirect home. Optional.
- ✅ **C8.** `index.html` missing meta description / Open Graph tags — matters for Instagram/TikTok link previews.
  - **Resolution (2026-08-25):** Full SEO + preview set added to `index.html` — Spanish meta description, canonical URL, Open Graph (`og:title/description/type/url/image/alt/locale`, `og:locale es_VE`) and Twitter `summary_large_image` card. Absolute URLs are injected at build time via `%VITE_PUBLIC_SITE_URL%` (new env var, documented in `.env.example`; **must be set in Vercel before launch** or previews render broken). Favicon switched to `favicon.svg` with PNG fallback. Guarded by static contract tests (`src/test/indexHtml.test.ts`). TODO (cosmetic): dedicated 1200×630 OG image — currently reuses `tokki_logo.png` (~1.3 MB).
- 🔄 **C9.** No automated tests at all. At minimum, unit-test phone helpers + envelope normalization before integration.
  - **Update (2026-08-25):** Vitest + Testing Library now set up (jsdom, `pnpm test` / `pnpm test:run`, setup in `src/test/setup.ts`; TDD mandated in AGENTS.md). First suites shipped: checkout cédula behavior (4 tests) + admin order detail full-data rendering (5 tests). Still missing: phone helper + `api()` envelope normalization unit tests — do these next per the original suggestion.
- 🔄 **C10.** Admin order pages don't display `delivery_type` / `payment_method` (`OrdersDashboardPage` / admin `OrderDetailPage`). Once orders carry these fields via the API, surface them (e.g. chip in detail header). Backend jest suite also currently broken (pre-existing ESM config issue) — fix before relying on its tests.
  - **Update (2026-08-25):** Admin `OrderDetailPage` now shows cédula (client card) + a dedicated "Entrega y pago" card with human-readable labels resolved from `DELIVERY_TYPES` / `PAYMENT_METHODS`. Remaining: surface chips in the `OrdersDashboardPage` list rows.

---

## ✅ Already solid (no action)

- Routes centralized in `src/lib/routes.ts`; no hardcoded paths in pages.
- Auth abstraction (`AuthProvider` / `AdminClerkProvider` / `RequireRole` / `useAdminAuth`) keeps `@clerk/*` out of the storefront bundle entirely.
- Envelope normalization (`success` string quirk, `row`/`updated_row`) already implemented in `api/client.ts`.
- E.164 phone validation for ~90 countries with per-country hints.
- Admin bundle lazy-loading + Suspense boundaries.
- `pnpm lint` passes clean.

---

## Suggested order of attack

1. **A2** prod proxy (needs backend public URL — coordinate)
2. **A1** harden `api/client.ts`
3. **A5 / B5 / B6** remaining contract decisions with backend team (blocking questions)
4. **A3** stop losing checkout fields
5. **A6 + B1–B4** wire-up page by page (loading/error states included)
6. C-items opportunistically

---

## Progress log

| Date | Item | Change |
|------|------|--------|
| 2026-08-22 | — | Audit created |
| 2026-08-24 | A4 | Backend added `category` attribute → resolved (verify exact value match with `CATEGORIES` during wire-up) |
| 2026-08-24 | A4 | Verified against backend source (`c_products.js`, `tokki_schema.sql`, `API_CONTRACT.md`) — fully compatible; display-name convention documented on both sides. Caveat noted: no server-side allow-list. |
| 2026-08-24 | Contract | Delivery types redefined to exactly three canonical values, **enforced at both layers** (verified: controller allowlist in `c_orders.js` + `orders_delivery_type_check` DB constraint): `envio_nacional` ("Envío Nacional"), `delivery` ("Delivery"), `retiro_tienda` ("Retiro en Tienda") — see `src/constants/index.ts`. All docs on both repos synced. Note: A3 still open — checkout doesn't send these fields yet. |
| 2026-08-24 | Contract | Final cross-repo compatibility scan: ✅ slugs byte-identical both sides; default selection (`envio_nacional`) valid; case-sensitive allowlist safe (closed `<select>`/radios); 400 message matches docs; frontend lint+build pass. Side findings: backend jest suite broken (pre-existing ESM config) → added C10 (admin UI doesn't show delivery/payment yet). |
| 2026-08-24 | Contract | Payment methods redefined (frontend): exactly five — `pago_movil`, `binance`, `zelle`, `paypal`, `cash`. **Rule:** `cash` ("Efectivo") only offered for `delivery_type = retiro_tienda`; changing delivery invalidates/reset the selection (`getPaymentMethods()` in `constants/index.ts`). `bank_transfer` removed. Backend still stores it free-form — flag allowlist + conditional rule to backend when wiring orders. |
| 2026-08-24 | UI fix | Toast overflow on mobile: checkout error toast (`.checkout-toast`) and admin toast (`.product-toast`) used `white-space: nowrap` → long messages clipped outside the pill on narrow screens. Fixed with `width: max-content` + `text-align: center` (hug content when short, wrap when long). |
| 2026-08-24 | A6 | Loading/error states shipped for all screens (3 parallel agents): `useAsync` hook + `ErrorState` + route `ErrorBoundary` + async store facades (`fetchProducts` / `fetchOrderSummaries` / `fetchOrderDetail`, 350 ms simulated latency, `NotFoundError`). Browse pages keep TopNav during pending/error; product detail no longer flashes "no encontrado"; admin order detail distinguishes 404 vs failure; checkout submit hardened with try/catch + toast; confirmation without state shows honest "Pedido no encontrado". Lint+build clean; zero sync store reads left in pages. |
| 2026-08-25 | Contract (NEW) | **Cédula field added to checkout** — client form now collects a Venezuelan ID with prefix combobox (`V-` / `E-` / `J-`) + digits-only input, validated (5–9 digits) and sent as combined `"V-12345678"` on the order client. Persisted locally via `createOrder`; surfaced in admin OrderDetailPage. ⚠️ Backend action needed: add `cedula` column to clients/orders schema + accept it in `POST /api/orders`; sync API_CONTRACT.md before wire-up. |
| 2026-08-25 | A3 | Checkout now sends `delivery_type` + `payment_method` through `createOrder()` and they persist on the order — no longer dropped. |
| 2026-08-25 | C9 | Test infra landed: Vitest 4 + Testing Library (jsdom, threads pool for Windows worker timeouts), `pnpm test`/`pnpm test:run`, TDD workflow codified in AGENTS.md. 9 behavior tests passing (checkout cédula, admin order detail). Phone-helper + envelope-normalization unit tests still pending. |
| 2026-08-25 | C10 | Admin OrderDetailPage now displays cédula + "Entrega y pago" (delivery/payment labels from constants slugs). OrdersDashboardPage list chips still pending. |
| 2026-08-25 | C8 | SEO + link-preview tags shipped in `index.html` (description, canonical, OG, Twitter card). New `VITE_PUBLIC_SITE_URL` env var (`.env.example`) — set it in Vercel before launch. Static tests guard the tags. Test infra hardened: jsdom `localStorage` shim in setup, single-worker config (`maxWorkers: 1`, `fileParallelism: false`) to dodge flaky Windows worker spawns. Suite: 14/14 green, lint + build clean. |
| 2026-08-25 | Bugfix | Admin product form could not type multi-word names ("Peluche de Naruto"): per-keystroke `.trim()` ate trailing spaces before the next word landed. Fix: two-phase sanitizing — light strip (control chars + 80-char cap) while typing via `sanitizeTextInput`, whitespace collapse/trim on blur & save via `normalizeTextInput` (`src/utils/productText.ts`, unit-tested). Also closed B6 (item_count = LINES, aligned with backend COUNT + regression test). Backend untouched. |
| 2026-08-25 | A5 ✅ | Image upload wired to the exact backend implementation: new products API client (multipart "image" field, 5 MB cap, WebP pipeline untouched server-side), Clerk Bearer via getAdminToken in auth context, admin form on real CRUD + upload/delete-image with object-URL previews, storefront reads live API products. First real wire-up slice complete — products domain now authoritative from Postgres. |
