import { test, expect } from '@playwright/test';

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Fresa',
    product_price: '3.50',
    qty_available: 20,
    in_stock: true,
    category: 'Maquillaje',
    product_description: 'Bálsamo labial hidratante sabor fresa con acabado brillante.',
    product_image_url: null,
  },
];

function setupMocks(page: import('@playwright/test').Page) {
  return page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
    });
  });
}

test.describe('Product Detail Share Feature', () => {
  test('updates document title with product name and price on product page', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/products/1');

    await expect(page).toHaveTitle('Bálsamo Labial Fresa — $3.50 | Tokki Shop');
  });

  test('displays share button in detail nav alongside back link', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/products/1');

    const backLink = page.locator('.back-link');
    await expect(backLink).toBeVisible();
    await expect(backLink).toContainText('Volver');

    const shareBtn = page.locator('.share-btn');
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toHaveAttribute('aria-label', 'Compartir Bálsamo Labial Fresa');
    await expect(shareBtn).toContainText('Compartir');
  });

  test('copies product URL to clipboard and shows kawaii toast feedback on desktop', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await setupMocks(page);
    await page.goto('/products/1');

    const shareBtn = page.locator('.share-btn');
    await shareBtn.click();

    // Verify toast notification appears with friendly feedback
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('¡Enlace copiado al portapapeles!');

    await page.screenshot({ path: 'test-results/product-share-toast.png' });

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('/products/1');
  });

  test('navigates cleanly on mobile viewport without layout breaks', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupMocks(page);
    await page.goto('/products/1');

    const nav = page.locator('.detail-nav');
    await expect(nav).toBeVisible();

    const backLink = page.locator('.back-link');
    const shareBtn = page.locator('.share-btn');

    await expect(backLink).toBeVisible();
    await expect(shareBtn).toBeVisible();

    const navBox = await nav.boundingBox();
    const backBox = await backLink.boundingBox();
    const shareBox = await shareBtn.boundingBox();

    expect(navBox).not.toBeNull();
    expect(backBox).not.toBeNull();
    expect(shareBox).not.toBeNull();

    // Verify both buttons are within the horizontal bounds of the viewport
    if (navBox && backBox && shareBox) {
      expect(backBox.x).toBeGreaterThanOrEqual(0);
      expect(shareBox.x + shareBox.width).toBeLessThanOrEqual(375);
    }

    await page.screenshot({ path: 'test-results/product-share-mobile.png' });
  });
});
