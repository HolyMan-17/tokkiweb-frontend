import { test, expect, type Page } from '@playwright/test';

const ACTIVE_CATEGORIES = [
  'Menos de un dolar',
  'Zona KPOP',
  'Maquillaje',
  'Skincare',
  'Pines & Chapas',
  'Papeleria',
  'Bolsas o cajas de regalo',
  'Regalos de pareja',
] as const;

const UNUSED_CATEGORIES = ['Cosplays', 'Figuras', 'Peluches'] as const;

const MOCK_PRODUCTS = ACTIVE_CATEGORIES.map((category, index) => ({
  product_id: index + 100,
  product_name: `Producto ${category}`,
  product_price: `${(index + 1) * 2}.00`,
  qty_available: 10,
  in_stock: true,
  category,
  product_description: `Producto de prueba en ${category}`,
  product_image_url: null,
}));

function mockCatalogApi(page: Page) {
  return page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
    });
  });
}

test.describe('CatalogPage Category Quick-Jump Bar', () => {
  for (const viewport of [
    { name: 'mobile 375x812', width: 375, height: 812 },
    { name: 'desktop 1280x800', width: 1280, height: 800 },
  ]) {
    test(`shows only active categories, fits cleanly, and scrolls to target section on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockCatalogApi(page);
      await page.goto('/');

      const jumpNav = page.getByRole('navigation', { name: 'Ir a una categoría' });
      await expect(jumpNav).toBeVisible();

      const pills = jumpNav.locator('button.category-jump-pill');
      await expect(pills).toHaveCount(ACTIVE_CATEGORIES.length);

      const pillLabels = await pills.evaluateAll((els) =>
        els.map((el) => el.textContent?.trim() ?? ''),
      );
      expect(pillLabels).toEqual([...ACTIVE_CATEGORIES]);

      for (const unused of UNUSED_CATEGORIES) {
        await expect(jumpNav.getByRole('button', { name: unused })).toHaveCount(0);
      }

      // Every pill stays compact and its icon is normalized (not oversized by CatalogPage rules)
      const pillMetrics = await pills.evaluateAll((els) =>
        els.map((el) => {
          const pillRect = el.getBoundingClientRect();
          const img = el.querySelector('.category-emoji-img');
          const imgRect = img?.getBoundingClientRect();
          return {
            height: pillRect.height,
            imgWidth: imgRect?.width ?? 0,
            imgHeight: imgRect?.height ?? 0,
          };
        }),
      );
      for (const metric of pillMetrics) {
        expect(metric.height).toBeLessThanOrEqual(44);
        expect(metric.imgWidth).toBeLessThanOrEqual(30);
        expect(metric.imgHeight).toBeLessThanOrEqual(30);
      }

      // No page-wide horizontal overflow
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);

      // Click Papeleria pill and assert smooth scroll lands below the sticky top nav
      const papeleriaPill = jumpNav.getByRole('button', { name: 'Papeleria' });
      await papeleriaPill.click();
      await page.mouse.move(0, 0);

      await expect(papeleriaPill).toHaveCSS('background-color', 'rgb(255, 255, 255)');

      await expect(async () => {
        const position = await page.evaluate(() => {
          const nav = document.querySelector('nav.top-nav');
          const section = document.getElementById('category-section-papeleria');
          if (!nav || !section) return null;
          return {
            navBottom: nav.getBoundingClientRect().bottom,
            sectionTop: section.getBoundingClientRect().top,
            viewportHeight: window.innerHeight,
          };
        });
        expect(position).not.toBeNull();
        expect(position!.sectionTop).toBeGreaterThanOrEqual(position!.navBottom - 4);
        expect(position!.sectionTop).toBeLessThan(position!.viewportHeight * 0.6);
      }).toPass({ timeout: 5000 });
    });
  }
});
