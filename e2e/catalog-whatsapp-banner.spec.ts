import { test, expect, type Page } from '@playwright/test';
import { VIEWPORTS } from './viewports';

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

const BANNER_VIEWPORTS = VIEWPORTS.filter((v) =>
  ['mobile-360', 'mobile-375', 'laptop-1280', 'desktop-1680'].includes(v.name),
);

test.describe('CatalogPage — postal de contacto WhatsApp', () => {
  for (const viewport of BANNER_VIEWPORTS) {
    test(`reemplaza el círculo de WhatsApp por la postal clicable (${viewport.name})`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await setup(page);
      await page.goto('/');

      const whatsappCard = page.locator('a.catalog-whatsapp');
      const envelope = whatsappCard.locator('img.catalog-whatsapp-envelope');
      const carousels = page.locator('.carousels-wrapper');
      const socials = page.locator('.social-circles');

      await whatsappCard.scrollIntoViewIfNeeded();

      await expect(whatsappCard).toBeVisible();
      await expect(whatsappCard).toHaveAttribute('href', 'https://wa.me/584122698243');
      await expect(whatsappCard).toContainText('Resolvemos todas tus dudas');
      await expect(whatsappCard).toContainText('WhatsApp');
      await expect(whatsappCard).toContainText('¡Escríbenos!');

      await expect(envelope).toBeVisible();
      const loaded = await envelope.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      );
      expect(loaded).toBe(true);

      await expect(socials.locator('a')).toHaveCount(2);
      await expect(socials.locator('.social-whatsapp')).toHaveCount(0);

      const carouselsBox = await carousels.boundingBox();
      const waBox = await whatsappCard.boundingBox();
      const socialsBox = await socials.boundingBox();

      expect(carouselsBox).not.toBeNull();
      expect(waBox).not.toBeNull();
      expect(socialsBox).not.toBeNull();

      expect(waBox!.y).toBeGreaterThanOrEqual(carouselsBox!.y + carouselsBox!.height - 1);
      expect(waBox!.y + waBox!.height).toBeLessThanOrEqual(socialsBox!.y + 1);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      if (viewport.name === 'laptop-1280' || viewport.name === 'mobile-375') {
        await page.screenshot({
          path: testInfo.outputPath(`catalog-whatsapp-banner-${viewport.name}.png`),
          animations: 'disabled',
        });
      }
    });
  }
});
