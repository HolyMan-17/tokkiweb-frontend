import { test, expect, type Locator, type Page } from '@playwright/test';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Fresa',
    product_price: '3.50',
    product_description: 'Bálsamo hidratante',
    qty_available: 20,
    in_stock: true,
    category: 'Maquillaje',
    product_image_url: null,
  },
  {
    product_id: 2,
    product_name: 'Mochi Fresa Cream',
    product_price: '2.50',
    product_description: 'Mochi',
    qty_available: 8,
    in_stock: true,
    category: 'Dulces & Comida Asiatica',
    product_image_url: null,
  },
];

/** Product #1 — the one the cart / checkout / admin surfaces point at. */
const PRODUCT_ONE = 'Bálsamo Labial Fresa';
/** Product #2 — first card of the catalog "Todos" carousel (newest first). */
const PRODUCT_TWO = 'Mochi Fresa Cream';

const CART_KEY = 'tokki_cart_v1';
const ORDER_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

/** One cart line so the cart / checkout pages render a real line item. */
const CART_SEED = JSON.stringify([
  {
    product: {
      product_id: 1,
      product_name: 'Bálsamo Labial Fresa',
      product_price: '3.50',
      product_description: 'x',
      qty_available: 20,
      in_stock: true,
      category: 'Maquillaje',
      product_image_url: null,
    },
    quantity: 2,
  },
]);

// ─── Mock helpers ─────────────────────────────────────────────────────────────

async function mockProducts(page: Page) {
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
    });
  });
}

async function mockOrders(page: Page) {
  await page.route('**/api/orders', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            order_id: 10,
            name: 'María',
            last_name: 'González',
            cedula: 'V-26345678',
            tlf_num: '+584146999670',
            total_amount: '18.50',
            status: 'approved',
            item_count: 3,
            created_at: '2026-08-13T14:30:00.000Z',
            delivery_type: 'envio_nacional',
            payment_method: 'pago_movil',
          },
        ],
      }),
    });
  });
}

async function mockOrderReceipt(page: Page) {
  await page.route('**/api/orders/receipt/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          order_id: 42,
          order_token: ORDER_TOKEN,
          status: 'pending',
          client: {
            name: 'María',
            last_name: 'González',
            cedula: 'V-26345678',
            tlf_num: '+584121234567',
          },
          delivery_type: 'envio_nacional',
          payment_method: 'pago_movil',
          total_amount: '7.00',
          created_at: '2026-08-13T14:30:00.000Z',
          items: [
            {
              product_name: 'Bálsamo de Fresa',
              product_qty: 2,
              product_price: '3.50',
              product_total: '7.00',
            },
          ],
        },
      }),
    });
  });
}

/** Seeds the persisted cart BEFORE the app boots (CartContext reads it on mount). */
async function seedCart(page: Page) {
  await page.addInitScript(
    (payload: { key: string; value: string }) => {
      window.localStorage.setItem(payload.key, payload.value);
    },
    { key: CART_KEY, value: CART_SEED },
  );
}

// ─── The guard ────────────────────────────────────────────────────────────────

/**
 * Asserts a product name is rendered in CAPS **without** touching the DOM text:
 *  1. `text-transform: uppercase` is applied (the visual result).
 *  2. `textContent` still equals the ORIGINAL mixed-case string (the DOM is
 *     untouched — screen readers, search and copy/paste keep the real casing).
 *  3. `innerText` — what the user actually reads — is the uppercase version.
 */
async function expectCaps(locator: Locator, originalText: string) {
  await expect(locator).toHaveCSS('text-transform', 'uppercase');
  await expect(locator).toHaveText(originalText);
  expect(await locator.evaluate((el) => el.innerText)).toBe(originalText.toUpperCase());
}

/** Sanity check: the surface really rendered (guards against false RED). */
async function expectPresent(locator: Locator) {
  await expect(locator).toBeVisible();
  expect(await locator.count()).toBeGreaterThan(0);
}

// ─── Surfaces ─────────────────────────────────────────────────────────────────

test.describe('Product names — CAPS rendering with untouched DOM text', () => {
  test('surface 1 — catalog card (.card-name)', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/');

    const name = page.locator('.card-name').first();
    await expectPresent(name);

    await expectCaps(name, PRODUCT_TWO);
  });

  test('surface 2 — product detail (h1.product-name)', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/products/1');

    const name = page.locator('h1.product-name');
    await expectPresent(name);

    // Computed value asserted directly (not only through toHaveCSS).
    const textTransform = await name.evaluate((el) => getComputedStyle(el).textTransform);
    expect(textTransform).toBe('uppercase');

    await expectCaps(name, PRODUCT_ONE);
  });

  test('surface 3 — cart line (.item-name)', async ({ page }) => {
    await mockProducts(page);
    await seedCart(page);
    await page.goto('/cart');

    const name = page.locator('.item-name').first();
    await expectPresent(name);

    await expectCaps(name, PRODUCT_ONE);
  });

  test('surface 4 — checkout line (.line-item-name)', async ({ page }) => {
    await mockProducts(page);
    await seedCart(page);
    await page.goto('/checkout');

    const name = page.locator('.line-item-name').first();
    await expectPresent(name);

    await expectCaps(name, PRODUCT_ONE);
  });

  test('surface 5 — confirmation line (.line-item-name)', async ({ page }) => {
    await mockOrderReceipt(page);
    await page.goto(`/confirmation/${ORDER_TOKEN}`);

    const name = page.locator('.line-item-name').first();
    await expectPresent(name);

    await expectCaps(name, 'Bálsamo de Fresa');
  });

  test('surface 6 — global search suggestion (.global-search__item-name)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockProducts(page);
    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /buscar producto/i });
    await expect(searchInput).toBeVisible();
    await searchInput.focus();

    const listbox = page.locator('#tokki-search-listbox');
    await expect(listbox).toBeVisible();

    const name = page.locator('.global-search__item-name').first();
    await expectPresent(name);

    // The suggestion shows one of the mocked products — read the real DOM text
    // and use it as the untouched original (never guess the casing).
    const originalText = ((await name.textContent()) ?? '').trim();
    expect(MOCK_PRODUCTS.map((p) => p.product_name)).toContain(originalText);

    await expectCaps(name, originalText);
  });

  test('surface 7 — admin product grid (.product-name)', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/tokki-admin/products');

    const name = page.locator('.product-name').first();
    await expectPresent(name);

    await expectCaps(name, PRODUCT_ONE);
  });

  test('surface 8 — POS picker card (.pos-product-name)', async ({ page }) => {
    await mockProducts(page);
    await page.goto('/tokki-admin/orders/new');

    const name = page.locator('.pos-product-name').first();
    await expectPresent(name);

    await expectCaps(name, PRODUCT_ONE);
  });

  test('surface 9 — dashboard top products (.tp-name)', async ({ page }) => {
    await mockProducts(page);
    await mockOrders(page);
    await page.goto('/tokki-admin');

    const name = page.locator('.tp-name').first();
    await expectPresent(name);

    await expectCaps(name, PRODUCT_ONE);
  });
});
