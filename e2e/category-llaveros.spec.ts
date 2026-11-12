import { test, expect } from '@playwright/test';

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Anillo Corazón Plata',
    product_price: '4.00',
    qty_available: 20,
    in_stock: true,
    category: 'Accesorios',
    product_description: 'Anillo ajustable con dije de corazón',
    product_image_url: null,
  },
  {
    product_id: 301,
    product_name: 'Llavero Bunny Glow',
    product_price: '3.00',
    qty_available: 25,
    in_stock: true,
    category: 'Llaveros',
    product_description: 'Llavero acrílico con bunny kawaii y brillo en la oscuridad',
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

test.describe('Llaveros Category & Icon Integration', () => {
  test('Catalog page renders Llaveros carousel right below Accesorios with keychain_art.png icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    // Only mocked categories render carousels: Todos, Accesorios, Llaveros
    const carouselHeadings = page.locator('.category-header .category-title');
    await expect(carouselHeadings.nth(0)).toContainText('Todos');
    await expect(carouselHeadings.nth(1)).toContainText('Accesorios');
    await expect(carouselHeadings.nth(2)).toContainText('Llaveros');

    const carouselTitle = page.getByRole('heading', { name: /Llaveros/i });
    await expect(carouselTitle).toBeVisible();

    const carouselSection = page.locator('.category-section', { has: carouselTitle });
    const iconImg = carouselSection.locator('.category-emoji-img.category-keychain');
    await expect(iconImg).toBeVisible();

    const src = await iconImg.getAttribute('src');
    expect(src).toContain('keychain_art');

    const productCard = carouselSection.getByText('Llavero Bunny Glow');
    await expect(productCard).toBeVisible();
  });

  test('Category page /categorias/llaveros displays keychain_art.png header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/llaveros');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Llaveros');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('keychain_art');

    await expect(page.getByText('Llavero Bunny Glow')).toBeVisible();
    await expect(page.getByText('Anillo Corazón Plata')).not.toBeVisible();
  });

  test('Admin Products page displays Llaveros filter chip with keychain_art.png', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/products');

    const keychainChip = page.locator('.chip', { hasText: 'Llaveros' });
    await expect(keychainChip).toBeVisible();

    const chipImg = keychainChip.locator('img');
    await expect(chipImg).toBeVisible();
    expect(await chipImg.getAttribute('src')).toContain('keychain_art');
  });

  test('Admin POS Order Creator displays Llaveros chip with keychain_art.png', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/orders/new');

    const posChip = page.locator('.pos-chip', { hasText: 'Llaveros' });
    await expect(posChip).toBeVisible();

    const chipImg = posChip.locator('img');
    await expect(chipImg).toBeVisible();
    expect(await chipImg.getAttribute('src')).toContain('keychain_art');
  });
});
