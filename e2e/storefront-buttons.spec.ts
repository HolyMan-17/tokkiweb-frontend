import { test, expect, type Page } from '@playwright/test';

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Sticker Conejito Kawaii',
    product_price: '0.75',
    qty_available: 25,
    in_stock: true,
    category: 'Menos de un dolar',
    product_description: 'Sticker de vinilo pastel',
    product_image_url: null,
  },
  {
    product_id: 2,
    product_name: 'Gloss Labial Fresa',
    product_price: '4.50',
    qty_available: 12,
    in_stock: true,
    category: 'Maquillaje',
    product_description: 'Brillo labial hidratante',
    product_image_url: null,
  },
];

function mockProductsApi(page: Page) {
  return page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
    });
  });
}

test.describe('Storefront Ver más and Category Volver sticker buttons', () => {
  test('styles Ver más and Volver as white Tokki sticker pill buttons', async ({
    page,
  }, testInfo) => {
    await mockProductsApi(page);

    // 1. Catalog Ver más buttons
    await page.goto('/');
    const seeMoreBtn = page.locator('.see-more-btn').first();
    await expect(seeMoreBtn).toBeVisible();

    const seeMoreMetrics = await page.evaluate(() => {
      const btn = document.querySelector('.see-more-btn')!;
      const cs = window.getComputedStyle(btn);
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      return {
        backgroundColor: cs.backgroundColor,
        bodyBackgroundColor: bodyBg,
        color: cs.color,
        borderTopStyle: cs.borderTopStyle,
        borderTopWidth: parseFloat(cs.borderTopWidth),
        boxShadow: cs.boxShadow,
        borderTopLeftRadius: parseFloat(cs.borderTopLeftRadius),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });

    expect(seeMoreMetrics.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(seeMoreMetrics.backgroundColor).not.toBe(seeMoreMetrics.bodyBackgroundColor);
    expect(seeMoreMetrics.color).toBe('rgb(138, 61, 96)');
    expect(seeMoreMetrics.borderTopStyle).toBe('solid');
    expect(seeMoreMetrics.borderTopWidth).toBeGreaterThanOrEqual(2);
    expect(seeMoreMetrics.boxShadow).not.toBe('none');
    expect(seeMoreMetrics.borderTopLeftRadius).toBeGreaterThanOrEqual(20);
    expect(seeMoreMetrics.scrollWidth).toBeLessThanOrEqual(seeMoreMetrics.clientWidth + 1);

    await page.locator('.category-header').first().screenshot({
      path: testInfo.outputPath('catalog-ver-mas.png'),
      animations: 'disabled',
    });

    // 2. Category and AllProducts Volver buttons
    for (const path of ['/categorias/menos-de-un-dolar', '/productos']) {
      await page.goto(path);
      const backLink = page.locator('.category-page .back-link');
      await expect(backLink).toBeVisible();

      const backMetrics = await page.evaluate(() => {
        const el = document.querySelector('.category-page .back-link')!;
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        return {
          backgroundColor: cs.backgroundColor,
          bodyBackgroundColor: bodyBg,
          color: cs.color,
          borderTopStyle: cs.borderTopStyle,
          borderTopWidth: parseFloat(cs.borderTopWidth),
          boxShadow: cs.boxShadow,
          borderTopLeftRadius: parseFloat(cs.borderTopLeftRadius),
          paddingLeft: parseFloat(cs.paddingLeft),
          height: rect.height,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      expect(backMetrics.backgroundColor).toBe('rgb(255, 255, 255)');
      expect(backMetrics.backgroundColor).not.toBe(backMetrics.bodyBackgroundColor);
      expect(backMetrics.color).toBe('rgb(138, 61, 96)');
      expect(backMetrics.borderTopStyle).toBe('solid');
      expect(backMetrics.borderTopWidth).toBeGreaterThanOrEqual(2);
      expect(backMetrics.boxShadow).not.toBe('none');
      expect(backMetrics.borderTopLeftRadius).toBeGreaterThanOrEqual(20);
      expect(backMetrics.paddingLeft).toBeGreaterThanOrEqual(14);
      expect(backMetrics.height).toBeGreaterThanOrEqual(38);
      expect(backMetrics.scrollWidth).toBeLessThanOrEqual(backMetrics.clientWidth + 1);

      if (path === '/categorias/menos-de-un-dolar') {
        await page.locator('.category-page-header').screenshot({
          path: testInfo.outputPath('category-volver.png'),
          animations: 'disabled',
        });
      }
    }
  });
});
