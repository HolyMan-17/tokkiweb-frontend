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
    product_id: 102,
    product_name: 'Lightstick Keychain Kawaii',
    product_price: '8.00',
    qty_available: 10,
    in_stock: true,
    category: 'Zona KPOP',
    product_description: 'Llavero lightstick mini con luz LED',
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

test.describe('Zona KPOP Category & Icon Integration', () => {
  test('Catalog page renders Zona KPOP carousel with properly sized kpop.png icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    // Verify carousel order: Todos is #1, Zona KPOP is #2
    const carouselHeadings = page.locator('.category-header .category-title');
    await expect(carouselHeadings.nth(0)).toContainText('Todos');
    await expect(carouselHeadings.nth(1)).toContainText('Zona KPOP');

    // Look for the carousel with title Zona KPOP
    const carouselTitle = page.getByRole('heading', { name: /Zona KPOP/i });
    await expect(carouselTitle).toBeVisible();

    // Verify the icon image inside the carousel title
    const carouselSection = page.locator('.category-section', { has: carouselTitle });
    const iconImg = carouselSection.locator('.category-emoji-img.category-kpop');
    await expect(iconImg).toBeVisible();

    const src = await iconImg.getAttribute('src');
    expect(src).toContain('kpop');

    // Verify sizing: icon rendered dimensions
    const box = await iconImg.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.height).toBeGreaterThanOrEqual(40);
    }

    // Verify the product cards within the carousel
    const productCard = carouselSection.getByText('Photocard Set BTS Especial');
    await expect(productCard).toBeVisible();

    // Take a screenshot of the Zona KPOP carousel section for visual verification
    await carouselSection.screenshot({ path: 'test-results/kpop-carousel-desktop.png' });
  });

  test('Category page /categorias/zona-kpop displays kpop.png header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/zona-kpop');

    // Page header title
    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Zona KPOP');

    // Icon inside header
    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('kpop');

    // Products are displayed
    await expect(page.getByText('Photocard Set BTS Especial')).toBeVisible();
    await expect(page.getByText('Lightstick Keychain Kawaii')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();

    // Take screenshot of the category page
    await page.screenshot({ path: 'test-results/kpop-category-page.png' });
  });

  test('Admin Products page displays Zona KPOP filter chip with kpop.png icon and modal dropdown option', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/products');

    // Filter chips toolbar
    const kpopChip = page.locator('.product-filter-chip, .chip', { hasText: 'Zona KPOP' });
    await expect(kpopChip).toBeVisible();

    const chipImg = kpopChip.locator('img');
    await expect(chipImg).toBeVisible();
    const src = await chipImg.getAttribute('src');
    expect(src).toContain('kpop');

    // Click filter chip to filter by Zona KPOP
    await kpopChip.click();
    await expect(page.getByText('Photocard Set BTS Especial')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();

    // Open "Crear Producto" modal and check category select options
    const newProductBtn = page.getByRole('button', { name: /Nuevo Producto|\+ Producto/i });
    if (await newProductBtn.isVisible()) {
      await newProductBtn.click();
      const categorySelect = page.locator('select#category');
      await expect(categorySelect).toBeVisible();

      // Check for the microphone emoji fallback in the select option
      const optionText = await categorySelect.locator('option[value="Zona KPOP"]').textContent();
      expect(optionText).toContain('🎤');
      expect(optionText).toContain('Zona KPOP');
    }

    await page.screenshot({ path: 'test-results/kpop-admin-products.png' });
  });

  test('Admin POS Order Creator displays Zona KPOP chip with kpop.png icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/orders/new');

    const posKpopChip = page.locator('.pos-chip', { hasText: 'Zona KPOP' });
    await expect(posKpopChip).toBeVisible();

    const chipImg = posKpopChip.locator('img');
    await expect(chipImg).toBeVisible();
    const src = await chipImg.getAttribute('src');
    expect(src).toContain('kpop');

    // Click the chip
    await posKpopChip.click();
    await expect(page.getByText('Photocard Set BTS Especial')).toBeVisible();
  });
});
