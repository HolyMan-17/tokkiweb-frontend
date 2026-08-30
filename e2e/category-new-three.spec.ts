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
    product_id: 601,
    product_name: 'Peluca Anime Blanca Larga',
    product_price: '12.00',
    qty_available: 5,
    in_stock: true,
    category: 'Cosplays',
    product_description: 'Peluca sintética para cosplay',
    product_image_url: null,
  },
  {
    product_id: 602,
    product_name: 'Cadena Spider Negro',
    product_price: '8.50',
    qty_available: 12,
    in_stock: true,
    category: 'Para ellos',
    product_description: 'Cadena estilo araña masculina',
    product_image_url: null,
  },
  {
    product_id: 603,
    product_name: 'Set Pulseras Pareja Magnéticas',
    product_price: '6.00',
    qty_available: 18,
    in_stock: true,
    category: 'Regalos de pareja',
    product_description: 'Pulseras magnéticas que se unen',
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

test.describe('New Categories — Cosplays, Para ellos, Regalos de pareja', () => {
  // ── Catalog Page (carousels) ─────────────────────────────────────────────

  test('Catalog page renders Cosplays carousel with cosplay.png icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    const carouselTitle = page.getByRole('heading', { name: /Cosplays/i });
    await expect(carouselTitle).toBeVisible();

    const carouselSection = page.locator('.category-section', { has: carouselTitle });
    const iconImg = carouselSection.locator('.category-emoji-img.category-cosplay');
    await expect(iconImg).toBeVisible();

    const src = await iconImg.getAttribute('src');
    expect(src).toContain('cosplay');

    const box = await iconImg.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(30);
      expect(box.height).toBeGreaterThanOrEqual(30);
    }

    const productCard = carouselSection.getByText('Peluca Anime Blanca Larga');
    await expect(productCard).toBeVisible();
  });

  test('Catalog page renders Para ellos carousel with spiderman.png icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    const carouselTitle = page.getByRole('heading', { name: /Para ellos/i });
    await expect(carouselTitle).toBeVisible();

    const carouselSection = page.locator('.category-section', { has: carouselTitle });
    const iconImg = carouselSection.locator('.category-emoji-img.category-spiderman');
    await expect(iconImg).toBeVisible();

    const src = await iconImg.getAttribute('src');
    expect(src).toContain('spiderman');

    const productCard = carouselSection.getByText('Cadena Spider Negro');
    await expect(productCard).toBeVisible();
  });

  test('Catalog page renders Regalos de pareja carousel with couple.png icon', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');

    const carouselTitle = page.getByRole('heading', { name: /Regalos de pareja/i });
    await expect(carouselTitle).toBeVisible();

    const carouselSection = page.locator('.category-section', { has: carouselTitle });
    const iconImg = carouselSection.locator('.category-emoji-img.category-couple');
    await expect(iconImg).toBeVisible();

    const src = await iconImg.getAttribute('src');
    expect(src).toContain('couple');

    const productCard = carouselSection.getByText('Set Pulseras Pareja Magnéticas');
    await expect(productCard).toBeVisible();
  });

  // ── Category Pages ───────────────────────────────────────────────────────

  test('Category page /categorias/cosplays displays cosplay.png header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/cosplays');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Cosplays');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('cosplay');

    await expect(page.getByText('Peluca Anime Blanca Larga')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();
  });

  test('Category page /categorias/para-ellos displays spiderman.png header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/para-ellos');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Para ellos');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('spiderman');

    await expect(page.getByText('Cadena Spider Negro')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();
  });

  test('Category page /categorias/regalos-de-pareja displays couple.png header icon and products', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/categorias/regalos-de-pareja');

    const pageTitle = page.locator('.category-page-title');
    await expect(pageTitle).toContainText('Regalos de pareja');

    const titleIcon = pageTitle.locator('img');
    await expect(titleIcon).toBeVisible();
    const src = await titleIcon.getAttribute('src');
    expect(src).toContain('couple');

    await expect(page.getByText('Set Pulseras Pareja Magnéticas')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();
  });

  // ── Admin Products — filter chips ────────────────────────────────────────

  test('Admin Products page displays filter chips with icons for all three new categories', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/products');

    // Cosplays chip
    const cosplayChip = page.locator('.product-filter-chip, .chip', { hasText: 'Cosplays' });
    await expect(cosplayChip).toBeVisible();
    const cosplayImg = cosplayChip.locator('img');
    await expect(cosplayImg).toBeVisible();
    expect(await cosplayImg.getAttribute('src')).toContain('cosplay');

    // Para ellos chip
    const ellosChip = page.locator('.product-filter-chip, .chip', { hasText: 'Para ellos' });
    await expect(ellosChip).toBeVisible();
    const ellosImg = ellosChip.locator('img');
    await expect(ellosImg).toBeVisible();
    expect(await ellosImg.getAttribute('src')).toContain('spiderman');

    // Regalos de pareja chip
    const parejaChip = page.locator('.product-filter-chip, .chip', { hasText: 'Regalos de pareja' });
    await expect(parejaChip).toBeVisible();
    const parejaImg = parejaChip.locator('img');
    await expect(parejaImg).toBeVisible();
    expect(await parejaImg.getAttribute('src')).toContain('couple');

    // Click Cosplays chip to filter
    await cosplayChip.click();
    await expect(page.getByText('Peluca Anime Blanca Larga')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Fresa')).not.toBeVisible();
  });

  // ── Admin POS Order Creator — chips ──────────────────────────────────────

  test('Admin POS Order Creator displays chips with icons for all three new categories', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/tokki-admin/orders/new');

    // Cosplays POS chip
    const posCosplay = page.locator('.pos-chip', { hasText: 'Cosplays' });
    await expect(posCosplay).toBeVisible();
    const posCosplayImg = posCosplay.locator('img');
    await expect(posCosplayImg).toBeVisible();
    expect(await posCosplayImg.getAttribute('src')).toContain('cosplay');

    // Para ellos POS chip
    const posEllos = page.locator('.pos-chip', { hasText: 'Para ellos' });
    await expect(posEllos).toBeVisible();
    const posEllosImg = posEllos.locator('img');
    await expect(posEllosImg).toBeVisible();
    expect(await posEllosImg.getAttribute('src')).toContain('spiderman');

    // Regalos de pareja POS chip
    const posPareja = page.locator('.pos-chip', { hasText: 'Regalos de pareja' });
    await expect(posPareja).toBeVisible();
    const posParejaImg = posPareja.locator('img');
    await expect(posParejaImg).toBeVisible();
    expect(await posParejaImg.getAttribute('src')).toContain('couple');

    // Click Cosplays to filter
    await posCosplay.click();
    await expect(page.getByText('Peluca Anime Blanca Larga')).toBeVisible();
  });
});
