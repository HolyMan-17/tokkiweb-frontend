import { test, expect, type Page } from '@playwright/test';

const PRODUCT = {
  product_id: 1,
  product_name: 'Bálsamo Labial Fresa',
  product_price: '3.50',
  product_description: 'Bálsamo hidratante',
  qty_available: 20,
  in_stock: true,
  category: 'Maquillaje',
  product_image_url: null,
};

async function setup(page: Page) {
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [PRODUCT] }),
    });
  });
  await page.addInitScript((value: string) => {
    window.localStorage.setItem('tokki_cart_v1', value);
  }, JSON.stringify([{ product: PRODUCT, quantity: 2 }]));
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
}

test.describe('Aviso de costos de envío (Delivery / Envío Nacional)', () => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 900 },
    { name: 'mobile', width: 375, height: 667 },
  ]) {
    test(`carrito y checkout muestran el aviso dentro del resumen (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await setup(page);

      // Cart
      await page.goto('/cart');
      const cartNote = page.locator('.cart-summary').getByRole('note');
      await expect(cartNote).toBeVisible();
      await expect(cartNote).toContainText(/Envío Nacional/);
      await expect(cartNote).toContainText(/no están incluidos/);
      await cartNote.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `test-results/shipping-note-cart-${viewport.name}.png`,
        animations: 'disabled',
      });

      // Checkout
      await page.goto('/checkout');
      const summary = page.locator('section', { has: page.getByRole('heading', { name: 'Resumen del pedido' }) });
      const checkoutNote = summary.getByRole('note');
      await expect(checkoutNote).toBeVisible();
      await expect(checkoutNote).toContainText(/Delivery/);
      await expect(summary).toHaveCSS('opacity', '1');
      await summary.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `test-results/shipping-note-checkout-${viewport.name}.png`,
        animations: 'disabled',
      });
    });
  }
});
