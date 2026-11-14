import { test, expect } from '@playwright/test';

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Fresa',
    product_price: '3.50',
    qty_available: 20,
    in_stock: true,
    category: 'Maquillaje',
    product_description: 'Bálsamo hidratante',
    product_image_url: null,
  },
  {
    product_id: 12,
    product_name: 'Photocard Set BTS',
    product_price: '6.50',
    qty_available: 15,
    in_stock: true,
    category: 'Zona KPOP',
    product_description: 'Set de photocards holográficas',
    product_image_url: null,
  },
  {
    product_id: 30,
    product_name: 'Sticker Vinilo Conejito Corazones',
    product_price: '0.75',
    qty_available: 40,
    in_stock: true,
    category: 'Menos de un dolar',
    product_description: 'Sticker de vinilo resistente al agua',
    product_image_url: null,
  },
  {
    product_id: 31,
    product_name: 'Paquete de Gomitas Dulces Kawaii',
    product_price: '0.90',
    qty_available: 25,
    in_stock: true,
    category: 'Menos de un dolar',
    product_description: 'Gomitas surtidas con formas adorables',
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

test.describe('Menos de un dolar Category & Icon Integration', () => {
  test('El catálogo muestra el carrusel Menos de un dolar como primera categoría justo después de Todos', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    const sections = page.locator('.category-section');
    await expect(sections.nth(0).locator('.category-title')).toContainText('Todos');
    await expect(sections.nth(1).locator('.category-title')).toContainText('Menos de un dolar');

    await page.screenshot({ path: 'test-results/menos-de-un-dolar-carousel.png' });
  });

  test('La página /categorias/menos-de-un-dolar muestra el título con icono cash y solo sus productos', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/menos-de-un-dolar');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Menos de un dolar');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('cash');

    await expect(page.getByText('Sticker Vinilo Conejito Corazones')).toBeVisible();
    await expect(page.getByText('Paquete de Gomitas Dulces Kawaii')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();

    await page.screenshot({ path: 'test-results/menos-de-un-dolar-category-page.png' });
  });

  test('La página de admin de productos muestra el chip de filtro Menos de un dolar', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/products');

    const chip = page.locator('.product-filter-chip, .chip', { hasText: 'Menos de un dolar' });
    await expect(chip).toBeVisible();

    const chipImg = chip.locator('img');
    await expect(chipImg).toBeVisible();
    const src = await chipImg.getAttribute('src');
    expect(src).toContain('cash');

    await page.screenshot({ path: 'test-results/menos-de-un-dolar-admin-chip.png' });
  });
});
