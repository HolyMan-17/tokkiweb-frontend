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
    product_id: 701,
    product_name: 'Figura Monkey D. Luffy Gear 5',
    product_price: '28.00',
    qty_available: 6,
    in_stock: true,
    category: 'Figuras',
    product_description: 'Figura coleccionable de anime',
    product_image_url: null,
  },
  {
    product_id: 702,
    product_name: 'Peluche Oso Cariñosito',
    product_price: '15.00',
    qty_available: 10,
    in_stock: true,
    category: 'Peluches',
    product_description: 'Peluche suave de oso',
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

test.describe('Figuras & Peluches Separation Integration', () => {
  test('Catalog page renders Figuras with luffy.png and Peluches with hopping_bear icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    // Figuras carousel
    const figurasTitle = page.getByRole('heading', { name: 'Figuras', exact: true });
    await expect(figurasTitle).toBeVisible();
    const figurasSection = page.locator('.category-section', { has: figurasTitle });
    const luffyIcon = figurasSection.locator('.category-emoji-img.category-luffy');
    await expect(luffyIcon).toBeVisible();
    expect(await luffyIcon.getAttribute('src')).toContain('luffy');

    // Peluches carousel
    const peluchesTitle = page.getByRole('heading', { name: 'Peluches', exact: true });
    await expect(peluchesTitle).toBeVisible();
    const peluchesSection = page.locator('.category-section', { has: peluchesTitle });
    const bearIcon = peluchesSection.locator('.category-emoji-img.category-bear');
    await expect(bearIcon).toBeVisible();
    expect(await bearIcon.getAttribute('src')).toContain('bear');
  });

  test('Category page /categorias/figuras displays luffy.png header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/figuras');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Figuras');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    expect(await titleIcon.getAttribute('src')).toContain('luffy');

    await expect(page.getByText('Figura Monkey D. Luffy Gear 5')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();
  });

  test('Category page /categorias/peluches displays hopping_bear header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/peluches');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Peluches');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    expect(await titleIcon.getAttribute('src')).toContain('bear');

    await expect(page.getByText('Peluche Oso Cariñosito')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();
  });

  test('Admin Products page displays Peluches and Figuras filter chips with respective icons', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/products');

    const figurasChip = page.getByRole('tab', { name: 'Figuras', exact: true });
    await expect(figurasChip).toBeVisible();
    expect(await figurasChip.locator('img').getAttribute('src')).toContain('luffy');

    const peluchesChip = page.getByRole('tab', { name: 'Peluches', exact: true });
    await expect(peluchesChip).toBeVisible();
    expect(await peluchesChip.locator('img').getAttribute('src')).toContain('bear');

    await figurasChip.click();
    await expect(page.getByText('Figura Monkey D. Luffy Gear 5')).toBeVisible();
    await expect(page.getByText('Peluche Oso Cariñosito')).not.toBeVisible();
  });

  test('Admin POS Order Creator displays Peluches and Figuras chips with respective icons', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/orders/new');

    const posFiguras = page.getByRole('tab', { name: 'Figuras', exact: true });
    await expect(posFiguras).toBeVisible();
    expect(await posFiguras.locator('img').getAttribute('src')).toContain('luffy');

    const posPeluches = page.getByRole('tab', { name: 'Peluches', exact: true });
    await expect(posPeluches).toBeVisible();
    expect(await posPeluches.locator('img').getAttribute('src')).toContain('bear');
  });
});
