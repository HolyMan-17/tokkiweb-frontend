import { test, expect, type Page } from '@playwright/test';

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
    product_name: 'Sticker Conejito Tokki',
    product_price: '0.80',
    product_description: 'Sticker impermeable',
    qty_available: 30,
    in_stock: true,
    category: 'Menos de un dolar',
    product_image_url: null,
  },
];

async function setup(page: Page) {
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
    });
  });
}

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 667 },
  { name: 'mobile-360', width: 360, height: 740 },
] as const;

test.describe('CatalogPage — aviso de envíos nacionales', () => {
  for (const viewport of VIEWPORTS) {
    test(`se muestra legible entre el banner inicial y Todos (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await setup(page);
      await page.goto('/');

      const hero = page.locator('.catalog-hero');
      const banner = page.getByRole('note');
      const todosSection = page.locator('.category-section').first();

      await expect(hero).toBeVisible();
      await expect(banner).toBeVisible();
      await expect(todosSection).toBeVisible();

      await expect(banner).toContainText('Envíos nacionales');
      await expect(banner).toContainText('todos los días');
      await expect(banner).toContainText('ZOOM');
      await expect(banner).toContainText('Tealca');
      await expect(banner).toContainText('Cobro a destino');

      await expect(hero.getByRole('note')).toHaveCount(0);

      const heroBox = await hero.boundingBox();
      const bannerBox = await banner.boundingBox();
      const todosBox = await todosSection.boundingBox();

      expect(heroBox).not.toBeNull();
      expect(bannerBox).not.toBeNull();
      expect(todosBox).not.toBeNull();

      expect(bannerBox!.y).toBeGreaterThanOrEqual(heroBox!.y + heroBox!.height - 1);
      expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(todosBox!.y + 1);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      if (viewport.name === 'desktop' || viewport.name === 'mobile') {
        await page.screenshot({
          path: `test-results/catalog-shipping-banner-${viewport.name}.png`,
          animations: 'disabled',
        });
      }
    });
  }
});
