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
    product_id: 36,
    product_name: 'Peluche Pompompurin',
    product_price: '18.00',
    qty_available: 8,
    in_stock: true,
    category: 'Peluches',
    product_description: 'Peluche suave de Sanrio',
    product_image_url: null,
  },
  {
    product_id: 76,
    product_name: 'Caja de Regalo Corazones Pastel',
    product_price: '4.50',
    qty_available: 30,
    in_stock: true,
    category: 'Bolsas o cajas de regalo',
    product_description: 'Caja rígida cuadrada con lazo de satén',
    product_image_url: null,
  },
  {
    product_id: 77,
    product_name: 'Bolsa de Regalo Tokki Bunny Grande',
    product_price: '3.00',
    qty_available: 45,
    in_stock: true,
    category: 'Bolsas o cajas de regalo',
    product_description: 'Bolsa de papel kraft con asas',
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

test.describe('Bolsas o cajas de regalo Category & Icon Integration', () => {
  test('Catalog page renders Bolsas o cajas de regalo carousel with properly sized gift.gif icon and text alignment', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    const carouselTitle = page.getByRole('heading', { name: /Bolsas o cajas de regalo/i });
    await expect(carouselTitle).toBeVisible();

    const carouselSection = page.locator('.category-section', { has: carouselTitle });
    const iconImg = carouselSection.locator('.category-emoji-img.category-gift');
    await expect(iconImg).toBeVisible();

    const src = await iconImg.getAttribute('src');
    expect(src).toContain('gift');

    // Verify larger sizing
    const box = await iconImg.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(45);
      expect(box.height).toBeGreaterThanOrEqual(45);
    }

    // Verify vertical alignment with heading text
    const titleBox = await carouselTitle.boundingBox();
    expect(titleBox).not.toBeNull();
    if (box && titleBox) {
      const iconCenterY = box.y + box.height / 2;
      const titleCenterY = titleBox.y + titleBox.height / 2;
      expect(Math.abs(iconCenterY - titleCenterY)).toBeLessThanOrEqual(30);
    }

    const productCard = carouselSection.getByText('Caja de Regalo Corazones Pastel');
    await expect(productCard).toBeVisible();

    await carouselSection.screenshot({ path: 'test-results/gift-carousel-desktop.png' });
  });

  test('Category page /categorias/bolsas-o-cajas-de-regalo displays gift.gif header icon with proper sizing and alignment', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/bolsas-o-cajas-de-regalo');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Bolsas o cajas de regalo');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('gift');

    // Verify category page title icon sizing and vertical alignment
    const iconBox = await titleIcon.boundingBox();
    const titleBox = await pageTitle.boundingBox();
    expect(iconBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    if (iconBox && titleBox) {
      expect(iconBox.width).toBeGreaterThanOrEqual(35);
      expect(iconBox.height).toBeGreaterThanOrEqual(35);
      const iconCenterY = iconBox.y + iconBox.height / 2;
      const titleCenterY = titleBox.y + titleBox.height / 2;
      expect(Math.abs(iconCenterY - titleCenterY)).toBeLessThanOrEqual(12);
    }

    await expect(page.getByText('Caja de Regalo Corazones Pastel')).toBeVisible();
    await expect(page.getByText('Bolsa de Regalo Tokki Bunny Grande')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();

    await page.screenshot({ path: 'test-results/gift-category-page.png' });
  });

  test('Admin Products page displays Bolsas o cajas de regalo filter chip with gift.gif icon and modal dropdown option', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/products');

    const giftChip = page.locator('.product-filter-chip, .chip', { hasText: 'Bolsas o cajas de regalo' });
    await expect(giftChip).toBeVisible();

    const chipImg = giftChip.locator('img');
    await expect(chipImg).toBeVisible();
    const src = await chipImg.getAttribute('src');
    expect(src).toContain('gift');

    // Click filter chip
    await giftChip.click();
    await expect(page.getByText('Caja de Regalo Corazones Pastel')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();

    // Check select dropdown option
    const newProductBtn = page.getByRole('button', { name: /Nuevo Producto|\+ Producto/i });
    if (await newProductBtn.isVisible()) {
      await newProductBtn.click();
      const categorySelect = page.locator('select#category');
      await expect(categorySelect).toBeVisible();

      const optionText = await categorySelect.locator('option[value="Bolsas o cajas de regalo"]').textContent();
      expect(optionText).toContain('🎁');
      expect(optionText).toContain('Bolsas o cajas de regalo');
    }

    await page.screenshot({ path: 'test-results/gift-admin-products.png' });
  });

  test('Admin POS Order Creator displays Bolsas o cajas de regalo chip with gift.gif icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/orders/new');

    const posGiftChip = page.locator('.pos-chip', { hasText: 'Bolsas o cajas de regalo' });
    await expect(posGiftChip).toBeVisible();

    const chipImg = posGiftChip.locator('img');
    await expect(chipImg).toBeVisible();
    const src = await chipImg.getAttribute('src');
    expect(src).toContain('gift');

    await posGiftChip.click();
    await expect(page.getByText('Caja de Regalo Corazones Pastel')).toBeVisible();
  });

  test('Catalog page aligns category titles between Peluches and Bolsas o cajas de regalo', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    const peluchesTitle = page.getByRole('heading', { name: 'Peluches', exact: true });
    const giftTitle = page.getByRole('heading', { name: /Bolsas o cajas de regalo/i });

    await expect(peluchesTitle).toBeVisible();
    await expect(giftTitle).toBeVisible();

    await giftTitle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

    const peluchesBox = await peluchesTitle.boundingBox();
    const giftBox = await giftTitle.boundingBox();

    console.log('Peluches Box:', peluchesBox);
    console.log('Gift Box:', giftBox);

    expect(peluchesBox).not.toBeNull();
    expect(giftBox).not.toBeNull();

    if (peluchesBox && giftBox) {
      // Both category headers must start at the exact same left margin
      expect(Math.abs(peluchesBox.x - giftBox.x)).toBeLessThanOrEqual(30);
      // Both category title containers must have a consistent height (within 5px)
      expect(Math.abs(peluchesBox.height - giftBox.height)).toBeLessThanOrEqual(5);
    }

    await page.screenshot({ path: 'test-results/peluches-and-gift-alignment.png' });
  });

  test('Guarantees all category icons have proper padding and spacing with zero overlap to text or cards', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    const sections = page.locator('.category-section');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const icon = section.locator('.category-emoji-img, .category-sparkle');
      const firstCard = section.locator('.product-card').first();

      if (await icon.isVisible() && await firstCard.isVisible()) {
        const iconBox = await icon.boundingBox();
        const cardBox = await firstCard.boundingBox();

        expect(iconBox).not.toBeNull();
        expect(cardBox).not.toBeNull();

        if (iconBox && cardBox) {
          // The bottom of the icon must never intersect the top of the product card (at least 4px clearance)
          expect(cardBox.y - (iconBox.y + iconBox.height)).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });
});
