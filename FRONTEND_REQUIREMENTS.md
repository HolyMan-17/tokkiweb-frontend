# Tokki Shop Frontend — Functional Requirements & API Contract

**Version:** 1.3.0
**Backend base URL (dev):** `http://localhost:3000`
**Frontend calls:** `/api/...` (Vite dev server proxies `/api` → `localhost:3000`)

---

## 0. Current implementation status

> **Update (v1.3.0):** the app is fully wired to the live API — the localStorage-backed data layer and mock seed no longer exist. Products carry a multi-image gallery (`product_image_urls`, max 5) rendered by the storefront carousel and managed through the admin multi-image uploader; see the gallery endpoints in §4.1.
>
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

> **Superseded (v1.1.0):** Clerk auth landed — see the status note below. (Original v1.0.0 plan: unauthenticated endpoints until auth shipped.)

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
| FR-8 | **Orders dashboard** — list all orders (buyer name, phone, total, status, item count, date), newest first, with one-tap card navigation to details and direct WhatsApp chat links. |
| FR-9 | **Order detail** — drill into a single order: header + client + line items with line totals. |
| FR-10 | **Approve order** — move a `pending` order to `approved`. |
| FR-11 | **Cancel order** — cancel a `pending` order (restores stock on the backend). |
| FR-12 | **Product management** — create, edit (name/price/description/quantity), and archive products, including the per-product image gallery (≤ 5 images, cover = index 0, reorder/remove via the admin uploader). |
| FR-13 | **In-Store & Manual Order Creator (POS)** — create orders directly from the admin panel (`/tokki-admin/orders/new`) for physical store or WhatsApp sales with live catalog search, category filters, quick-fill walk-in customer preset (`⚡ Cliente en Mostrador`), and instant auto-approval. |
| FR-14 | **Order Export** — download currently filtered orders as an RFC 4180 CSV file with UTF-8 BOM encoding for clean opening in Microsoft Excel. |

### 2.3 UI/UX considerations

- Consistent `{ success, data?, message? }` envelope handling — one shared fetch/API helper.
- Loading states while fetching; friendly empty states ("No products", "No orders").
- Client-side validation mirrors backend rules where cheap (non-empty fields, positive qty) — but **the backend is authoritative** for phone format and stock.

### 2.4 Design language & typography (kawaii × streetwear)

The store's marketing posts use cute handwritten-style fonts (e.g. "Lazy Dog", "Blueberry" — free download fonts not licensed for web embedding). The web app matches that kawaii vibe with **shipped** web fonts, self-hosted via `@fontsource/*` packages loaded in `src/main.tsx` — never a Google Fonts CDN:

- **Display / headings / buttons / prices / labels:** **DynaPuff** (400–700) — chunky rounded poster feel.
- **Body / UI text (paragraphs, form inputs, descriptions):** **Sour Gummy** (400–700) — soft rounded, readable at small sizes.
- **Fallbacks only:** `Baloo 2` / `Fredoka` (display stack) and `Quicksand` (body stack), declared in the `src/index.css` tokens.

**Shipped pairing:** `DynaPuff` (display) + `Sour Gummy` (body), with `Fredoka` reserved for wordmark accents. `AGENTS.md → Typography` is the authoritative source.

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
  category: string;             // display name, matches CATEGORIES[i].name
  qty_available: number;
  in_stock: boolean;
  product_image_url?: string | null; // absolute/relative URL; null = no image
  product_image_urls?: string[];     // ordered gallery (max 5); index 0 = cover,
                                     // mirrored by product_image_url
}

interface OrderSummary {
  order_id: number;
  name: string;
  last_name: string;
  cedula?: string | null;       // "V-12345678"; absent/null for legacy clients
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
  client: { name: string; last_name: string; cedula?: string | null; tlf_num: string };
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
      "in_stock": true,
      "product_image_url": "http://localhost:3000/images/products/7c9e6679-7425-40de-944b-e07fc1f90ae7.webp",
      "product_image_urls": [
        "http://localhost:3000/images/products/7c9e6679-7425-40de-944b-e07fc1f90ae7.webp"
      ]
    }
  ]
}
```

**Images:** every product payload carries `product_image_url` — an absolute URL (or `null` when no image) — plus the ordered gallery `product_image_urls` (max 5; index 0 = the cover, and `product_image_url` always mirrors it). Render them directly in `<img src>`; never build image URLs yourself. Files are WebP, ≤1600px wide.

Empty result: `{ "success": true, "message": "There's no registered products." }`

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
`400` → `{ success: false, message: ... }` where messages include `"All product fields are required!"`, `"A valid product category is required."`, `"Product quantity must be a whole number."`, or `"Product quantity can't be negative."`

> ⚠️ **Types are strict now:** `product_price` must be a JSON **number** and `qty_available` an **integer** — coerce `<input>` values (`Number(...)`, `parseInt`) before sending; string-typed numbers are rejected.

#### `PATCH /api/products/:product_id` — Update product (admin)
Body (all optional, at least one):
```json
{ "product_name": "…", "product_price": 19.99, "product_description": "…", "category": "Ropa", "qty_available": 10 }
```
`200` → `{ success: true, updated_row: { product_id, product_name, product_price, product_description, category, qty_available, in_stock } }`
`400` → `{ success: false, message: "At least 1 product field needs to be updated." }`, `"A valid product category is required."`, `"product_price must be a positive number."`, `"Product quantity must be a whole number."`, or `"Product quantity can't be negative."` (invalid values are rejected, never silently ignored)
`404` → `{ success: false, message: "Product was not found." }` (missing) or `"Product is archived."`

#### `DELETE /api/products/:product_id` — Archive product (admin)
Soft-delete: sets `is_archived = true`, `qty_available = 0`, `in_stock = false` (the stored image file is removed server-side too).
`200` → `{ success: true, message: "Product successfully archived" }`
`404` → `{ success: false, message: "Product ID is not valid." }`

#### `POST /api/products/:product_id/image` — Upload / replace image (admin, LEGACY)
Multipart form (NOT JSON) with a single file under the **`image`** field:

```ts
const form = new FormData();
form.append('image', file);          // jpeg / png / webp, ≤ 5 MB
await api(`/products/${id}/image`, { method: 'POST', body: form, getToken });
```

> ⚠️ When sending a `FormData`, do **not** set `Content-Type` manually — the browser supplies the multipart boundary. Strip the default header for this call.

Backend normalizes to WebP (≤1600px); the SPA also always pre-compresses client-side via `compressImage()` (`src/utils/compressImage.ts` — files ≤1 MB pass through untouched; larger files are downscaled to ≤1600 px and re-encoded as WebP q0.82). **Legacy semantics:** the new file takes index 0 (inserted when the gallery is empty, overwriting the cover key otherwise); other gallery images keep their positions. New code should use the gallery endpoint below.

`200` → `{ success: true, data: { product_id, product_image_urls, product_image_url } }`
`400` → size/type violations, e.g. `"Image exceeds the 5 MB size limit."`, `"File content is not a supported image (jpeg, png, webp)."`
`404` → `"Product was not found."` or `"Product is archived."`

#### `DELETE /api/products/:product_id/image` — Remove image (admin, LEGACY)
Removes the **cover** (index 0); idempotent no-op when the gallery is empty. Remaining images are reindexed.
`200` → `{ success: true, data: { product_id, product_image_urls, product_image_url } }`
`404` → `"Product was not found."` or `"Product is archived."`

#### `POST /api/products/:product_id/images` — Add a gallery image (admin, max 5)
Multipart form with the file under the **`image`** field (same constraints as above). Appends one image to the ordered gallery; the first image ever added becomes the cover (index 0).

`200` → `{ success: true, data: { product_id, product_image_urls, product_image_url } }`
`404` → `"Product was not found."` or `"Product is archived."`
`409` → the product already has 5 images: `{ success: false, message: "This product already has the maximum of 5 images." }`

Frontend wrapper: `addProductImage()` in `src/api/products.ts`.

#### `DELETE /api/products/:product_id/images?url=<url>` — Remove a gallery image (admin)
Removes one image by URL (exactly as returned in `product_image_urls`) and reindexes the rest; removing the cover promotes the next image to cover.

`200` → `{ success: true, data: { product_id, product_image_urls, product_image_url } }`
`400` → `"Unknown image URL."`
`404` → `"Product was not found."`, `"Product is archived."`, or `"Image was not found."`

Frontend wrapper: `removeProductImageByUrl()` in `src/api/products.ts`.

#### `PUT /api/products/:product_id/images/order` — Reorder gallery / set cover (admin)
JSON body `{ "urls": [...] }` containing **every** gallery image exactly once (same count, no duplicates, no unknown URLs) — otherwise `400`. The first URL becomes the cover.

`200` → `{ success: true, data: { product_id, product_image_urls, product_image_url } }`
`400` → `"Unknown image URL."` or `"Invalid image order."`
`404` → `"Product was not found."` or `"Product is archived."`

Frontend wrapper: `reorderProductImages()` in `src/api/products.ts`.

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
    "tlf_num": "041469996703",
    "cedula": "V-12345678"
  },
  "delivery_type": "envio_nacional",
  "payment_method": "pago_movil",
  "items": [
    { "product_id": 1, "product_qty": 2 },
    { "product_id": 2, "product_qty": 1 }
  ]
}
```

**Delivery types (backend-enforced):** `delivery_type` must be exactly one of `envio_nacional`, `delivery`, `retiro_tienda` (slugs). Map them to display labels in `DELIVERY_TYPES` — `"Envío Nacional"`, `"Delivery"`, `"Retiro en Tienda"` — the API only accepts the slugs; anything else returns `400`.

**Cedula (optional):** send it in `client_info.cedula` when the customer provides their Venezuelan ID. Backend normalizes lenient input (`v12345678`, stray spaces) to `"V-12345678"`; empty/absent stores `NULL`; invalid → `400` `"Invalid cedula format."`; already owned by another client → `409` `"Resource already exists."`.

**Payment methods:** the server currently accepts any non-empty string, but always send a `PAYMENT_METHODS` slug (`pago_movil`, `binance`, `zelle`, `paypal`, `cash`) — an allowlist constraint is planned backend-side.

**Items are type-checked up front:** every entry needs integer `product_id > 0` and `product_qty > 0`; malformed lists get `"Each item needs a valid product_id and a positive whole product_qty."` before any stock is touched.

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
    "payment_method": "pago_movil",
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
`404` → unknown `client_id`: `{ success: false, message: "Client doesn't exist." }`

> Malformed integer path params (`:product_id`, `:order_id`, `:client_id`) are rejected up front with `400` `"Invalid ID format."` on every endpoint.

#### `GET /api/orders/:order_id` — Single order detail
`200`:
```json
{
  "success": true,
  "data": {
    "order_id": 3,
    "status": "pending",
    "client": { "name": "Jane", "last_name": "Doe", "cedula": "V-12345678", "tlf_num": "+5841469996703" },
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
