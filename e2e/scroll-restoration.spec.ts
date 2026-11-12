import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * ─── Scroll-position preservation across navigations ──────────────────────────
 *
 * The app must remember where the user was on a screen and put them back
 * there when they come back to it. Three rules are guarded here:
 *
 *   1. a screen that was scrolled and left must open at the same offset when
 *      the user returns to it (T1 — storefront, T2 — admin panel);
 *   2. a screen the user has NEVER opened must open at the top (T3);
 *   3. a remembered offset that no longer fits a shorter screen must be
 *      clamped to that screen's maximum instead of being applied blindly or
 *      dropped (T4).
 *
 * These assertions are the RED phase: the behaviour does not exist yet.
 * A correct implementation has to restore the offset AFTER the screen's
 * content is laid out — restoring while the screen still shows its loading
 * state clamps the offset to 0, because the document is still short.
 */

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CATEGORY_NAMES = ['Maquillaje', 'Skincare', 'Accesorios'] as const;

/**
 * Latency the mocked API reproduces. A real backend always answers after a
 * round trip, so the screen is still in its loading state (short document)
 * when the app first tries to restore an offset. Without this delay the
 * restore would race the data load and the test would be flaky.
 */
const API_LATENCY_MS = 200;

/** Mutable product counter — a test can shrink the catalog between visits. */
interface ProductCounter {
  count: number;
}

function buildProducts(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    product_id: index + 1,
    product_name: `Producto ${index + 1}`,
    product_price: '10.00',
    product_description: 'Producto de prueba para el guard de scroll',
    qty_available: 12,
    in_stock: true,
    category: CATEGORY_NAMES[index % CATEGORY_NAMES.length],
    product_image_url: null,
  }));
}

function buildOrders(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    order_id: 100 + index,
    name: `Cliente${index}`,
    last_name: 'Prueba',
    cedula: `V-1234567${index % 10}`,
    tlf_num: '+584141234567',
    total_amount: '20.00',
    status: index % 3 === 0 ? 'pending' : 'approved',
    item_count: 2,
    created_at: '2026-08-13T14:30:00.000Z',
    delivery_type: 'envio_nacional',
    payment_method: 'pago_movil',
  }));
}

async function mockProducts(page: Page, counter: ProductCounter) {
  await page.route('**/api/products', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, API_LATENCY_MS));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: buildProducts(counter.count) }),
    });
  });
}

async function mockOrders(page: Page, count: number) {
  await page.route('**/api/orders', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, API_LATENCY_MS));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: buildOrders(count) }),
    });
  });
}

/**
 * NOTE: the orders-LIST route pattern does NOT match '/api/orders/100' — the
 * per-order endpoint needs its own pattern with the trailing path segment
 * (see the route call below).
 */
async function mockOrderDetail(page: Page, orderId: number) {
  await page.route('**/api/orders/*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, API_LATENCY_MS));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          order_id: orderId,
          client: {
            name: 'Cliente0',
            last_name: 'Prueba',
            cedula: 'V-12345670',
            tlf_num: '+584141234567',
          },
          total_amount: '20.00',
          status: 'pending',
          created_at: '2026-08-13T14:30:00.000Z',
          items: [
            {
              product_name: 'Producto 1',
              product_qty: 2,
              product_price: '10.00',
              product_total: '20.00',
            },
          ],
        },
      }),
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Chrome restores the scroll offset by itself on a history navigation, which
 * would make a "going back restores the scroll" assertion pass even when the
 * feature is completely broken. Manual mode hands that responsibility to the
 * app, so the test only ever sees what the app does.
 */
async function disableNativeScrollRestoration(page: Page) {
  await page.addInitScript(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  });
}

/**
 * The app sets `html { scroll-behavior: smooth }`, so a plain scrollTo would
 * animate and the assertion would read a mid-flight value.
 */
async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
}

async function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => Math.round(window.scrollY));
}

/** How far the document can be scrolled right now. */
async function maxScrollOf(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
}

/**
 * Polls until the window offset lands within `tolerance` of `target`.
 * Never assert scrollY straight away — the restore may be animated.
 */
async function expectScrollNear(page: Page, target: number, tolerance = 20) {
  await expect
    .poll(
      () => scrollY(page),
      {
        timeout: 5000,
        message: `window.scrollY should land near ${target} (±${tolerance})`,
      },
    )
    .toBeGreaterThanOrEqual(target - tolerance);

  const y = await scrollY(page);
  expect(y).toBeLessThanOrEqual(target + tolerance);
}

/**
 * Clicks WITHOUT the auto-scroll Playwright performs before a real click.
 *
 * The "Ver más" pill of the second carousel sits under the sticky top nav at
 * scrollY = 900, so a real click scrolls the window first (measured: 900 →
 * 213) and destroys the very offset under test before the navigation even
 * happens. The first order card of the admin list has the same problem. The
 * dispatched event runs the very same React onClick handler (React Router
 * navigates) but leaves the scroll position untouched.
 */
async function clickWithoutScrolling(locator: Locator) {
  await locator.dispatchEvent('click');
}

// ─── The guard ────────────────────────────────────────────────────────────────

test.describe('Scroll restoration', () => {
  test('restores the homepage scroll offset after returning from a category page', async ({ page }) => {
    await disableNativeScrollRestoration(page);
    await mockProducts(page, { count: 60 });

    await page.goto('/');
    // One ~420px carousel per non-empty category ⇒ 3 categories make the
    // homepage well over 1000px tall.
    await expect(page.locator('.category-section').first()).toBeVisible();
    await expect(page.locator('.product-card').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(1200);

    await scrollTo(page, 900);
    await expectScrollNear(page, 900);

    // The FIRST carousel is "Todos" (its "Ver más" opens /productos), so the
    // SECOND one is a real category.
    await clickWithoutScrolling(page.locator('.see-more-btn').nth(1));
    await expect(page).toHaveURL(/\/categorias\//);
    await expect(page.locator('.product-card').first()).toBeVisible();

    // Back to the homepage …
    await clickWithoutScrolling(page.getByRole('link', { name: /volver/i }).first());
    await expect(page).toHaveURL('/');
    await expect(page.locator('.category-section').first()).toBeVisible();

    // … and the user lands exactly where they left.
    await expectScrollNear(page, 900);
  });

  test('restores the admin orders list offset after visiting an order detail and going back', async ({ page }) => {
    await disableNativeScrollRestoration(page);
    await mockOrders(page, 40);
    await mockOrderDetail(page, 100);
    await mockProducts(page, { count: 5 });

    await page.goto('/tokki-admin/orders');
    await expect(page.locator('.order-card')).toHaveCount(40);

    await scrollTo(page, 800);
    await expectScrollNear(page, 800);

    await clickWithoutScrolling(page.locator('.order-id').first());
    await expect(page).toHaveURL(/\/tokki-admin\/orders\/100$/);
    await expect(page.locator('.order-detail-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Pedido #100/ }).first()).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/tokki-admin\/orders$/);
    await expect(page.locator('.order-card')).toHaveCount(40);

    await expectScrollNear(page, 800);
  });

  test('a screen that was never visited still opens at the top', async ({ page }) => {
    await disableNativeScrollRestoration(page);
    await mockProducts(page, { count: 60 });

    await page.goto('/categorias/maquillaje');
    await expect(page.locator('.product-card')).toHaveCount(20);
    await scrollTo(page, 1200);
    await expectScrollNear(page, 1200);

    // '/productos' was never opened in this session → it opens at the top.
    await page.goto('/productos');
    await expect(page.locator('.product-card').first()).toBeVisible();

    await expect
      .poll(() => scrollY(page), {
        timeout: 5000,
        message: 'a screen that was never visited must open at the top',
      })
      .toBe(0);
  });

  test('clamps a remembered offset that no longer fits the page', async ({ page }) => {
    await disableNativeScrollRestoration(page);
    const products: ProductCounter = { count: 60 };
    await mockProducts(page, products);

    await page.goto('/categorias/maquillaje');
    await expect(page.locator('.product-card')).toHaveCount(20);
    await scrollTo(page, 1200);
    await expectScrollNear(page, 1200);

    // Leave the category — the app has to remember 1200 for it …
    await clickWithoutScrolling(page.getByRole('link', { name: /volver/i }).first());
    await expect(page).toHaveURL('/');
    await expect(page.locator('.category-section').first()).toBeVisible();

    // … walk over to another screen …
    await clickWithoutScrolling(page.locator('.see-more-btn').nth(0));
    await expect(page).toHaveURL('/productos');
    await expect(page.locator('.product-card').first()).toBeVisible();

    // … and shrink the catalog behind it.
    products.count = 3;

    // Come back: the category screen is now much shorter, so 1200 no longer
    // fits and the remembered offset has to be clamped to the new maximum.
    await clickWithoutScrolling(page.getByRole('link', { name: /volver/i }).first());
    await expect(page).toHaveURL('/');
    await expect(page.locator('.category-section').first()).toBeVisible();
    await clickWithoutScrolling(page.locator('.see-more-btn').nth(1));
    await expect(page).toHaveURL(/\/categorias\/maquillaje$/);
    await expect(page.locator('.product-card')).toHaveCount(1);

    // Precondition: the shortened screen is still scrollable, otherwise
    // "clamped to the maximum" and "not restored at all" would be
    // indistinguishable.
    const maxScroll = await maxScrollOf(page);
    expect(maxScroll).toBeGreaterThan(20);

    await expect
      .poll(
        () => scrollY(page),
        {
          timeout: 5000,
          message:
            'the remembered offset must be clamped to the new page maximum, not dropped to 0',
        },
      )
      .toBeGreaterThanOrEqual(maxScroll - 10);

    const y = await scrollY(page);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(maxScroll + 2);
  });
});
