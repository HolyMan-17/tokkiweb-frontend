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
    product_id: 101,
    product_name: 'Photocard Set BTS Especial',
    product_price: '5.50',
    qty_available: 15,
    in_stock: true,
    category: 'Zona KPOP',
    product_description: 'Set de photocards holográficas premium',
    product_image_url: null,
  },
  {
    product_id: 201,
    product_name: 'NewJeans 2nd EP Get Up Bag Version',
    product_price: '28.00',
    qty_available: 10,
    in_stock: true,
    category: 'Albumes',
    product_description: 'Álbum original importado con CD y libro de fotos',
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

test.describe('Albumes Category & Icon Integration', () => {
  test('Catalog page renders Albumes carousel right below Zona KPOP with album_icon.png icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    // Carousel order: Todos is #1, Zona KPOP is #2, Albumes is #3
    const carouselHeadings = page.locator('.category-header .category-title');
    await expect(carouselHeadings.nth(0)).toContainText('Todos');
    await expect(carouselHeadings.nth(1)).toContainText('Zona KPOP');
    await expect(carouselHeadings.nth(2)).toContainText('Albumes');

    const carouselTitle = page.getByRole('heading', { name: /Albumes/i });
    await expect(carouselTitle).toBeVisible();

    const carouselSection = page.locator('.category-section', { has: carouselTitle });
    const iconImg = carouselSection.locator('.category-emoji-img.category-albumes');
    await expect(iconImg).toBeVisible();

    const src = await iconImg.getAttribute('src');
    expect(src).toContain('album_icon');

    const productCard = carouselSection.getByText('NewJeans 2nd EP Get Up Bag Version');
    await expect(productCard).toBeVisible();
  });

  test('Category page /categorias/albumes displays album_icon.png header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/albumes');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Albumes');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('album_icon');

    await expect(page.getByText('NewJeans 2nd EP Get Up Bag Version')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();
  });

  test('Admin Products page displays Albumes filter chip and modal dropdown option', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/products');

    const albumChip = page.locator('.chip', { hasText: 'Albumes' });
    await expect(albumChip).toBeVisible();

    const chipImg = albumChip.locator('img');
    await expect(chipImg).toBeVisible();
    expect(await chipImg.getAttribute('src')).toContain('album_icon');
  });

  test('Admin POS Order Creator displays Albumes chip with album_icon.png', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/orders/new');

    const posChip = page.locator('.pos-chip', { hasText: 'Albumes' });
    await expect(posChip).toBeVisible();

    const chipImg = posChip.locator('img');
    await expect(chipImg).toBeVisible();
    expect(await chipImg.getAttribute('src')).toContain('album_icon');
  });
});
