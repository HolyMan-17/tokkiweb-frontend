import { test, expect } from '@playwright/test';

test.describe('Cart Page Product Images & Layout', () => {
  test('renders product image thumbnails and responsive cart item layout', async ({ page }) => {
    // Seed local storage with mock cart items (one with image, one without)
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'tokki_cart_v1',
        JSON.stringify([
          {
            product: {
              product_id: 1,
              product_name: 'Tokki Bunny Plush',
              product_price: '15.00',
              product_description: 'Peluche kawaii',
              qty_available: 10,
              in_stock: true,
              category: 'Peluches',
              product_image_url: '/assets/bunny.gif',
            },
            quantity: 2,
          },
          {
            product: {
              product_id: 2,
              product_name: 'Gloss Mágico',
              product_price: '8.00',
              product_description: 'Brillo labial',
              qty_available: 5,
              in_stock: true,
              category: 'Maquillaje',
              product_image_url: null,
            },
            quantity: 1,
          },
        ]),
      );
    });

    // Mock /api/products
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              product_id: 1,
              product_name: 'Tokki Bunny Plush',
              price: '15.00',
              qty_available: 10,
              in_stock: true,
              category: 'Peluches',
              image_url: '/assets/bunny.gif',
            },
            {
              product_id: 2,
              product_name: 'Gloss Mágico',
              price: '8.00',
              qty_available: 5,
              in_stock: true,
              category: 'Maquillaje',
              image_url: null,
            },
          ],
        }),
      });
    });

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // 1) Verify Cart Header
    await expect(page.locator('h1.page-title')).toHaveText('Mi Carrito');

    // 2) Verify product image thumbnail is rendered for item with image
    const itemWithImage = page.locator('.cart-item-card').first();
    const imgThumb = itemWithImage.locator('.item-image-thumb');
    await expect(imgThumb).toBeVisible();
    await expect(imgThumb).toHaveAttribute('src', '/assets/bunny.gif');

    // 3) Verify placeholder is rendered for item without image
    const itemWithoutImage = page.locator('.cart-item-card').nth(1);
    const placeholder = itemWithoutImage.locator('.item-image-placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveText('G');

    // 4) Verify total calculation
    const subtotal = page.locator('.summary-value');
    await expect(subtotal).toContainText('$38.00');
  });

  test('mobile viewport rendering of cart items and thumbnails', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.addInitScript(() => {
      window.localStorage.setItem(
        'tokki_cart_v1',
        JSON.stringify([
          {
            product: {
              product_id: 1,
              product_name: 'Tokki Bunny Plush',
              product_price: '15.00',
              product_description: 'Peluche kawaii',
              qty_available: 10,
              in_stock: true,
              category: 'Peluches',
              product_image_url: '/assets/bunny.gif',
            },
            quantity: 1,
          },
        ]),
      );
    });

    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              product_id: 1,
              product_name: 'Tokki Bunny Plush',
              price: '15.00',
              qty_available: 10,
              in_stock: true,
              category: 'Peluches',
              image_url: '/assets/bunny.gif',
            },
          ],
        }),
      });
    });

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const card = page.locator('.cart-item-card');
    await expect(card).toBeVisible();

    const imgThumb = card.locator('.item-image-thumb');
    await expect(imgThumb).toBeVisible();

    // Verify quantity selector and remove button are accessible
    const removeBtn = card.locator('.btn-remove');
    await expect(removeBtn).toBeVisible();
  });
});
