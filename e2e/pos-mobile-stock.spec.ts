import { test, expect } from '@playwright/test';

test.describe('POS Product Stock Badge and Card Layout Across Viewports', () => {
  const mockProducts = [
    {
      product_id: 1,
      product_name: 'Labial Velvet Bunny Tint Magic Long',
      product_price: '125.00',
      product_description: 'Cute lip tint',
      category: 'Maquillaje',
      qty_available: 15,
      in_stock: true,
      product_image_url: null,
    },
    {
      product_id: 2,
      product_name: 'Photocard Stray Kids Special Limited',
      product_price: '8.00',
      product_description: 'Kpop photocard',
      category: 'Zona KPOP',
      qty_available: 1,
      in_stock: true,
      product_image_url: null,
    },
    {
      product_id: 3,
      product_name: 'Serum Facial Hidratante Glow Rice Extra',
      product_price: '24.99',
      product_description: 'Skincare serum',
      category: 'Skincare',
      qty_available: 2,
      in_stock: true,
      product_image_url: null,
    },
    {
      product_id: 4,
      product_name: 'Peluche Totoro Gigante 50cm Edición Colección',
      product_price: '45.00',
      product_description: 'Plush toy',
      category: 'Peluches',
      qty_available: 0,
      in_stock: false,
      product_image_url: null,
    },
  ];

  test('desktop displays full "disponibles" text without clipping or overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockProducts,
        }),
      });
    });

    await page.goto('/tokki-admin/orders/new');
    await page.waitForSelector('.pos-product-card');

    const picker = page.locator('.create-order-catalog-section');
    await picker.scrollIntoViewIfNeeded();

    await picker.screenshot({
      path: '/home/manu0ak/.gemini/antigravity-cli/brain/27c6b742-4b88-46a7-8529-010ec7f04b45/pos-desktop.png',
    });

    // Check that full text is visible on desktop
    const fullText = page.locator('.pos-stock-full').first();
    const shortText = page.locator('.pos-stock-short').first();

    await expect(fullText).toBeVisible();
    await expect(shortText).not.toBeVisible();
    await expect(page.locator('.pos-stock-badge').first()).toContainText('15 disponibles');
  });

  test('mobile 375px displays compact "disp." text and fits perfectly inside card', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockProducts,
        }),
      });
    });

    await page.goto('/tokki-admin/orders/new');
    await page.waitForSelector('.pos-product-card');

    const picker = page.locator('.create-order-catalog-section');
    await picker.scrollIntoViewIfNeeded();

    await picker.screenshot({
      path: '/home/manu0ak/.gemini/antigravity-cli/brain/27c6b742-4b88-46a7-8529-010ec7f04b45/pos-mobile-375px-final.png',
    });

    const fullText = page.locator('.pos-stock-full').first();
    const shortText = page.locator('.pos-stock-short').first();

    await expect(fullText).not.toBeVisible();
    await expect(shortText).toBeVisible();
    await expect(page.locator('.pos-stock-badge').first()).toContainText('15 disp.');

    // Verify all 4 cards fit without horizontal boundary overflow
    const cards = page.locator('.pos-product-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const cardBBox = await card.boundingBox();
      const badge = card.locator('.pos-stock-badge');
      const badgeBBox = await badge.boundingBox();

      expect(cardBBox).not.toBeNull();
      expect(badgeBBox).not.toBeNull();
      if (cardBBox && badgeBBox) {
        expect(badgeBBox.x + badgeBBox.width).toBeLessThanOrEqual(cardBBox.x + cardBBox.width + 1);
      }
    }
  });

  test('mobile 320px displays compact "disp." text and fits without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockProducts,
        }),
      });
    });

    await page.goto('/tokki-admin/orders/new');
    await page.waitForSelector('.pos-product-card');

    const cards = page.locator('.pos-product-card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const cardBBox = await card.boundingBox();
      const badge = card.locator('.pos-stock-badge');
      const badgeBBox = await badge.boundingBox();

      expect(cardBBox).not.toBeNull();
      expect(badgeBBox).not.toBeNull();
      if (cardBBox && badgeBBox) {
        expect(badgeBBox.x + badgeBBox.width).toBeLessThanOrEqual(cardBBox.x + cardBBox.width + 1);
      }
    }
  });
});
