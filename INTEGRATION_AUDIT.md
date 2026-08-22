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
- **Status:** ☐

### A4. `category` missing from the backend contract
- **Where:** `src/types/index.ts` (Product), `src/constants/index.ts` (CATEGORIES), `FRONTEND_REQUIREMENTS.md` §4.1
- **Problem:** The entire storefront UX depends on `Product.category` (per-category carousels, `/categorias/:slug`, admin filters, product form). But the contract's `POST/PATCH /api/products` only accepts name/price/description/qty — no category field exists server-side.
- **Fix:** requires backend work — add a `category` column + accept it in create/update. Until then, all API-created products would be uncategorized. Flag to backend team before starting integration.
- **Status:** ☐

### A5. Product images unsupported by backend; uploader stores base64 in localStorage
- **Where:** `src/pages/admin/products/ProductManagementPage.tsx:169-180` (`handleImageChange`), Product form save
- **Problem:** Admin uploads images as base64 DataURLs persisted into localStorage (~3 MB each → quota bomb). The backend contract has no image field or upload endpoint at all.
- **Fix (decision needed):** either hide/remove the uploader until the backend supports image storage (recommended pre-integration), or add an upload endpoint/multipart support to the contract.
- **Status:** ☐

### A6. Zero loading/error states across the flow
- **Where:** every page reads synchronously via `useProducts()` / `useOrders()`
- **Problem:** `<LoadingSpinner />` and `<EmptyState />` exist in `src/components/ui/` but are **never used anywhere**. All pages assume synchronous local data. Once pages hit the network they need loading + error + retry states (see AGENTS.md → Current State checklist).
- **Fix:** during page-by-page wire-up, replace direct store reads with `useEffect` + `api()` and render `<LoadingSpinner />` while pending and an error state with retry on failure. Consider a tiny `useApi<T>` hook to avoid repeating boilerplate in ~10 places.
- **Status:** ☐

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
- **Where:** `src/store/localStore.ts` (`toSummary` sums units) vs contract `OrderSummary.item_count`
- **Problem:** Local sim counts total units; the contract doesn't define whether it's lines or units. Admin UI copy says "artículos".
- **Fix:** confirm with backend which value `item_count` carries and align.
- **Status:** ☐

---

## 🟡 C. Minor bugs & polish

- ☐ **C1.** Toast timer leak — `ProductDetailPage.tsx:36` `setTimeout` not cleared on unmount (Checkout & Products do this correctly via refs).
- ☐ **C2.** Search inconsistency — category page searches name only; `/productos` searches name + description. Pick one behavior (name+description recommended).
- ☐ **C3.** `ConfirmDialog` lacks focus trap / Escape-to-close / focus restore (a11y).
- ☐ **C4.** Duplicated inline SVGs (cart, gear) between `Header.tsx` and `CatalogTopNav.tsx` — extract shared icon module.
- ☐ **C5.** Canceling an order locally doesn't restore stock (backend does) — demo-only divergence; remember when comparing behaviors after wiring.
- ☐ **C6.** Dev Tools page displays `VITE_API_URL` but client hardcodes `/api` — misleading until A1 lands.
- ☐ **C7.** No branded 404 — silent redirect home. Optional.
- ☐ **C8.** `index.html` missing meta description / Open Graph tags — matters for Instagram/TikTok link previews.
- ☐ **C9.** No automated tests at all. At minimum, unit-test phone helpers + envelope normalization before integration.

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
3. **A4 / A5 / B5 / B6** contract decisions with backend team (blocking questions)
4. **A3** stop losing checkout fields
5. **A6 + B1–B4** wire-up page by page (loading/error states included)
6. C-items opportunistically

---

## Progress log

| Date | Item | Change |
|------|------|--------|
| 2026-08-22 | — | Audit created |
