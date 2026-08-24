# Tokki Shop Frontend — Functional Requirements & API Contract

**Version:** 1.1.0
**Backend base URL (dev):** `http://localhost:3000`
**Frontend calls:** `/api/...` (Vite dev server proxies `/api` → `localhost:3000`)

---

## 0. Current implementation status

> **Update (v1.1.0):** the full shop flow (catalog, cart, checkout → order creation, admin
> product CRUD + order approve/cancel, dashboard stats) is implemented against a
> **localStorage-backed data layer** (`src/store/localStore.ts`, seeded from `src/mock/data.ts`
> on first run) so the flow can be tested before the real API is wired. All pages still follow
> this document's data shapes and behavior — `localStore.ts` is a stand-in for the API.
> Clerk auth IS wired: the admin panel lives at the hidden path `/tokki-admin`
> (`ADMIN_PATH` in `src/lib/auth.ts`) and is guarded by Clerk roles (`owner` / `tech`).
>
> **Wiring the real API** = replacing `useProducts()` / `useOrders()` / `createOrder()` /
> `setOrderStatus()` / `saveProducts()` calls with `useEffect` + `api()` calls, then deleting
> `localStore.ts` and the mock seed. See `AGENTS.md → Current State` for the checklist.

---

## 1. Overview

The Tokki Shop frontend is a React 19 + TypeScript + Vite single-page application that lets visitors browse a product catalog, place guest-checkout orders, and lets the shop owner manage products and orders from an admin dashboard.

Two distinct audiences:

1. **Customers (public):** browse catalog, add to cart, checkout with contact info.
2. **Shop owner (admin):** manage products, review orders, approve/cancel orders.

> Auth (Clerk) is deferred. Until it lands, all endpoints are unauthenticated. The admin pages will be built against the API now and locked down with `requireAuth()` later.

> **Status (v1.1.0):** Clerk auth has landed — admin panel lives at the hidden `/tokki-admin`
> path, guarded by `RequireRole` with roles from `user.publicMetadata.role` (`owner`, `tech`).
> See `AGENTS.md → Auth & Admin Routing`.

---

## 2. Functional Requirements

### 2.1 Customer-facing

| Req | Description |
|-----|-------------|
| FR-1 | **Home / Catalog** — display a grid of all available products (`name`, `price`, `description`, stock badge). Products that are out of stock (`in_stock: false`) should be visibly marked and not purchasable. |
| FR-2 | **Product detail** — show a single product's full info; link from the catalog. |
| FR-3 | **Cart** — add products with a quantity; see a running total; adjust/remove line items. Cart should never allow a quantity above `qty_available`. |
| FR-4 | **Checkout** — collect buyer name, last name, country code + phone, delivery type, and payment method; submit the order. |
| FR-5 | **Phone input** — a country-code selector (e.g. `+58` Venezuela, `+57` Colombia) paired with the local number. Frontend may send either `{ country_code, tlf_num }` or a full `+…` number. |
| FR-6 | **Order confirmation** — after checkout, show the returned `order_id` and total as confirmation. |
| FR-7 | **Order status feedback** — surface order lifecycle states as badges: `pending`, `approved`, `canceled`. |

### 2.2 Admin-facing

| Req | Description |
|-----|-------------|
| FR-8 | **Orders dashboard** — list all orders (buyer name, phone, total, status, item count, date), newest first. |
| FR-9 | **Order detail** — drill into a single order: header + client + line items with line totals. |
| FR-10 | **Approve order** — move a `pending` order to `approved`. |
| FR-11 | **Cancel order** — cancel a `pending` order (restores stock on the backend). |
| FR-12 | **Product management** — create, edit (name/price/description/quantity), and archive products. |

### 2.3 UI/UX considerations

- Consistent `{ success, data?, message? }` envelope handling — one shared fetch/API helper.
- Loading states while fetching; friendly empty states ("No products", "No orders").
- Client-side validation mirrors backend rules where cheap (non-empty fields, positive qty) — but **the backend is authoritative** for phone format and stock.

### 2.4 Design language & typography (kawaii × streetwear)

The store's marketing posts use cute handwritten-style fonts (e.g. "Lazy Dog", "Blueberry" — free download fonts not licensed for web embedding). The web app should **match that kawaii vibe** using web-licensed Google Fonts instead:

- **Display / headings:** **Baloo 2** — chunky rounded poster feel (closest to the store's fat/rounded post typography). Fallback anchor: **Fredoka**, already used on the existing landing page.
- **Handwritten accents** (if more Lazy Dog energy is desired): **Patrick Hand** or **Kalam** for doodle-style labels/annotations.
- **Body / UI text (paragraphs, prices, forms):** **Quicksand** — soft rounded, readable at small sizes. Alternative: **Nunito** for a rounder, friendlier feel.
- **Logo/wordmark:** keep **Fredoka** for brand-consistent accents.

**Recommended pairing:** `Baloo 2` (display) + `Quicksand` (body), with `Fredoka` reserved for the wordmark. All three are available on Google Fonts and as `@fontsource/*` packages for self-hosting.

**Aesthetic direction (catalog + storefront):**
- Pastel base (brand pink `#ffeded` family) with cream/white surfaces; a few bold accent colors for CTAs and status badges.
- Rounded shapes (buttons, cards, inputs), chunky borders/shadows for a sticker-like feel.
- Pixel-bunny / sparkle motifs carried over from the landing page as decorative accents.
- Playful micro-interactions: hover "squish", staggered page-load reveals, floating/sparkle ambient motion.

---

## 3. Data Types (frontend TS interfaces)

```ts
interface Product {
  product_id: number;
  product_name: string;
  product_price: string;        // numeric strings from PG
  product_description: string;
  qty_available: number;
  in_stock: boolean;
}

interface OrderSummary {
  order_id: number;
  name: string;
  last_name: string;
  tlf_num: string;
  total_amount: string;
  status: 'pending' | 'approved' | 'canceled';
  item_count: number;
  created_at: string;
}

interface OrderItem {
  product_name: string;
  product_qty: number;
  product_price: string;
  product_total: string;        // qty * unit price (computed server-side)
}

interface OrderDetail {
  order_id: number;
  status: 'pending' | 'approved' | 'canceled';
  client: { name: string; last_name: string; tlf_num: string };
  total_amount: string;
  created_at: string;
  items: OrderItem[];
}
```

> **Note:** prices arrive as **strings** (`"49.99"`) because PostgreSQL returns `NUMERIC` as text. Treat them as currency strings in the UI; do math with numbers (e.g. `Number(x)`) and format back.

---

## 4. API Contract

### 4.0 General envelope

Most endpoints wrap payloads in a consistent envelope:

```json
{ "success": true,  "data": { ... },  "message": "optional" }
{ "success": false, "message": "error detail" }
```

> ⚠️ **Known inconsistency (handle in the API helper):** the **Products** CRUD endpoints do **not** use `data` uniformly — create returns `row`, update returns `updated_row`. See each endpoint below.

---

### 4.1 Products API

#### `GET /api/products` — List available products
Returns all non-archived products.

Optional query param: `?category=<name>` — exact, case-sensitive match against `CATEGORIES[i].name` (e.g. `/api/products?category=Maquillaje`). Without it, returns every active product (the client-side filter in `CategoryPage` keeps working either way).

```json
{
  "success": true,
  "data": [
    {
      "product_id": 1,
      "product_name": "Tokki Hoodie",
      "product_price": "49.99",
      "product_description": "Comfortable oversized cotton hoodie",
      "category": "Ropa",
      "qty_available": 25,
      "in_stock": true
    }
  ]
}
```

Empty result: `{ "success": "true", "message": "There's no registered products." }`
> ⚠️ Note: `success` is the **string** `"true"` in the empty case (backend quirk). Check `data`/`message` presence rather than the `success` type.

#### `GET /api/products/:product_id` — Single product
`200` → `{ success: true, data: { ...Product } }` (includes `category`)
`404` → `{ success: false, message: "Product was not found." }`

#### `POST /api/products` — Create product (admin)
Body:
```json
{
  "product_name": "Tokki T-Shirt",
  "product_price": 24.99,
  "product_description": "100% organic cotton graphic tee",
  "category": "Ropa",
  "qty_available": 50
}
```

**Category rules:** required, non-empty string, max 100 chars. Send the display name exactly as it appears in `CATEGORIES` (the storefront matches `p.category === category.name`). Existing rows created before this field default to `'Otros'`.

`201` → `{ success: true, row: { product_id, product_name, product_price, product_description, category, qty_available, in_stock, is_archived } }`
`400` → `{ success: false, message: "All product fields are required!" }`, `"A valid product category is required."`, or `"Product quantity can't be negative."`

#### `PATCH /api/products/:product_id` — Update product (admin)
Body (all optional, at least one):
```json
{ "product_name": "…", "product_price": 19.99, "product_description": "…", "category": "Ropa", "qty_available": 10 }
```
`200` → `{ success: true, updated_row: { product_id, product_name, product_price, product_description, category, qty_available, in_stock } }`
`400` → `{ success: false, message: "At least 1 product field needs to be updated." }` or `"A valid product category is required."`
`401` → `{ success: false, message: "Product is archived." }`
`404` → `{ success: false, message: "Product was not found." }`

#### `DELETE /api/products/:product_id` — Archive product (admin)
Soft-delete: sets `is_archived = true`, `qty_available = 0`, `in_stock = false`.
`200` → `{ success: true, message: "Product successfully archived" }`
`404` → `{ success: false, message: "Product ID is not valid." }`

---

### 4.2 Orders API

#### `POST /api/orders` — Create order (checkout)

Body:
```json
{
  "client_info": {
    "name": "Jane",
    "last_name": "Doe",
    "country_code": "+58",
    "tlf_num": "041469996703"
  },
  "delivery_type": "envio_nacional",
  "payment_method": "credit_card",
  "items": [
    { "product_id": 1, "product_qty": 2 },
    { "product_id": 2, "product_qty": 1 }
  ]
}
```

**Delivery types (backend-enforced):** `delivery_type` must be exactly one of `envio_nacional`, `delivery`, `retiro_tienda` (slugs). Map them to display labels in `DELIVERY_TYPES` — `"Envío Nacional"`, `"Delivery"`, `"Retiro en Tienda"` — the API only accepts the slugs; anything else returns `400`.

**Phone rules:**
- Either `country_code` + local `tlf_num` (`"041469996703"`) **or** a full international `tlf_num` (`"+5841469996703"`) — with `country_code` omitted in the latter case.
- The backend normalizes to E.164 (stored + shown in lists). `041469996703` → `+5841469996703`.
- Invalid → `400` `{ success: false, message: "Phone number must be a valid international format." }`

`201` → order summary:
```json
{
  "success": true,
  "data": {
    "order_id": 5,
    "delivery_type": "envio_nacional",
    "payment_method": "credit_card",
    "total_amount": "99.98",
    "items": [
      { "id": 1, "name": "Tokki Hoodie", "ordered_qty": 2, "price": "49.99" }
    ]
  },
  "message": "Order has been successfully created."
}
```

`400` (validation / stock / qty): e.g. `"Requested quantity is not available in the stock."`
`404` (missing product): `{ success: false, message: "Product was not found." }`

> Every new order is created with `status: "pending"`.

#### `GET /api/orders` — List all orders (admin)
`200` → `{ success: true, data: OrderSummary[] }` (newest first)
Empty → `{ success: true, message: "No orders have been placed." }`

#### `GET /api/orders/client/:client_id` — Client order history
`200` → `{ success: true, data: OrderSummary[] }`
Empty → `{ success: true, message: "No orders have been placed by this client." }`

#### `GET /api/orders/:order_id` — Single order detail
`200`:
```json
{
  "success": true,
  "data": {
    "order_id": 3,
    "status": "pending",
    "client": { "name": "Jane", "last_name": "Doe", "tlf_num": "+5841469996703" },
    "total_amount": "74.98",
    "created_at": "2026-08-04T12:00:00.000Z",
    "items": [
      { "product_name": "Tokki Hoodie", "product_qty": 2, "product_price": "49.99", "product_total": "99.98" }
    ]
  },
  "message": "Order retrieved."
}
```
`404` → `{ success: false, message: "Order doesn't exist." }`

#### `PATCH /api/orders/:order_id/cancel` — Cancel order
Only `pending` orders can be canceled. Backend restores stock in the same transaction.
`200` → `{ success: true, message: "Order was canceled." }`
`400` → `{ success: false, message: "Order can only be canceled while pending." }`
`404` → `{ success: false, message: "Order doesn't exist." }`

#### `PATCH /api/orders/:order_id/approve` — Approve order
Only `pending` orders can be approved.
`200`:
```json
{ "success": true, "data": { "order_id": 3, "status": "approved" }, "message": "Order was successfully approved" }
```
`400` → `{ success: false, message: "Order has already been processed." }`
`404` → `{ success: false, message: "Requested order doesn't exist." }`

---

## 5. Delivery types & payment methods

- **Delivery (backend-enforced):** `delivery_type` must be exactly one of three canonical slugs —
  `envio_nacional`, `delivery`, `retiro_tienda`. The orders controller rejects anything else with
  `400` and a DB CHECK constraint (`orders_delivery_type_check`) backstops it. Display labels
  ("Envío Nacional", "Delivery", "Retiro en Tienda") live in `DELIVERY_TYPES`
  (`src/constants/index.ts`); the API stores/returns slugs only.
- **Payment (frontend rule):** the checkout offers exactly five methods — `PAYMENT_METHODS`
  slugs: `pago_movil`, `binance`, `zelle`, `paypal`, `cash`. **Efectivo (`cash`) is only
  offered/selectable when `delivery_type` is `retiro_tienda`**; switching delivery away from
  pickup while `cash` is selected resets the method to the first available option
  (`getPaymentMethods(deliveryType)` in `src/constants/index.ts`). Server-side, `payment_method`
  remains a free string for now.

> Keep these lists in a single constants file so they're consistent across forms and the admin UI,
> and sync any backend-side allowlist changes with `DELIVERY_TYPES` / `PAYMENT_METHODS`.

---

## 6. Cross-cutting frontend concerns

1. **Shared API helper** — one `fetch` wrapper (e.g. `api/client.ts`) that prepends `/api`, JSON-parses, and normalizes the `success/data/message` envelope (including the products `row`/`updated_row` quirk).
2. **Currency formatting** — format `"49.99"` string prices for display (e.g. `new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' })`).
3. **Status badge component** — map `pending | approved | canceled` → color/label.
4. **Proxy config** — Vite `server.proxy` must forward `/api` to `http://localhost:3000`.

---

## 7. Sources of truth

- Backend contract: `../tokkiweb-backend/API_CONTRACT.md`
- Backend plan/progress: `../tokkiweb-backend/PROJECT_SUMMARY_AND_PLAN.md`
- Backend endpoint plan: `../tokkiweb-backend/plans/endpoints_plan.md`

*If this document and the backend docs disagree, the backend code + `API_CONTRACT.md` win — flag the discrepancy and update this doc.*
