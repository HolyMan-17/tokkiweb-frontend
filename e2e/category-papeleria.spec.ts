import { test, expect } from '@playwright/test';

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Figura Tanjiro Kamado',
    product_price: '16.00',
    qty_available: 8,
    in_stock: true,
    category: 'Figuras',
    product_description: 'Figura coleccionable de Demon Slayer',
    product_image_url: null,
  },
  {
    product_id: 401,
    product_name: 'Cuaderno Origami Tokki',
    product_price: '4.50',
    qty_available: 18,
    in_stock: true,
    category: 'Papeleria',
    product_description: 'Libreta kawaii de 80 hojas con diseño pastel',
    product_image_url: null,
  },
  {
    product_id: 402,
    product_name: 'Caja de Regalo Pastel',
    product_price: '3.00',
    qty_available: 12,
    in_stock: true,
    category: 'Bolsas o cajas de regalo',
    product_description: 'Caja decorada con lazo de satén',
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

test.describe('Papeleria Category & Icon Integration', () => {
  test('Catalog page renders Papeleria carousel right before Bolsas o cajas de regalo with paper_crane.avif icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    const carouselHeadings = page.locator('.category-header .category-title');
    await expect(carouselHeadings.nth(0)).toContainText('Todos');
    await expect(carouselHeadings.nth(1)).toContainText('Figuras');
    await expect(carouselHeadings.nth(2)).toContainText('Papeleria');
    await expect(carouselHeadings.nth(3)).toContainText('Bolsas o cajas de regalo');

    const carouselTitle = page.getByRole('heading', { name: /Papeleria/i });
    await expect(carouselTitle).toBeVisible();

    const carouselSection = page.locator('.category-section', { has: carouselTitle });
    const iconImg = carouselSection.locator('.category-emoji-img.category-papeleria');
    await expect(iconImg).toBeVisible();

    const src = await iconImg.getAttribute('src');
    expect(src).toContain('paper_crane');

    const productCard = carouselSection.getByText('Cuaderno Origami Tokki');
    await expect(productCard).toBeVisible();
  });

  test('Category page /categorias/papeleria displays paper_crane.avif header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/papeleria');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Papeleria');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('paper_crane');

    await expect(page.getByText('Cuaderno Origami Tokki')).toBeVisible();
    await expect(page.getByText('Figura Tanjiro Kamado')).not.toBeVisible();
  });

  test('Admin Products page displays Papeleria filter chip with paper_crane.avif', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/products');

    const papeleriaChip = page.locator('.chip', { hasText: 'Papeleria' });
    await expect(papeleriaChip).toBeVisible();

    const chipImg = papeleriaChip.locator('img');
    await expect(chipImg).toBeVisible();
    expect(await chipImg.getAttribute('src')).toContain('paper_crane');
  });

  test('Admin POS Order Creator displays Papeleria chip with paper_crane.avif', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/orders/new');

    const posChip = page.locator('.pos-chip', { hasText: 'Papeleria' });
    await expect(posChip).toBeVisible();

    const chipImg = posChip.locator('img');
    await expect(chipImg).toBeVisible();
    expect(await chipImg.getAttribute('src')).toContain('paper_crane');
  });
});
