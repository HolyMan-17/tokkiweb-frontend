import { test, expect } from '@playwright/test';

test.describe('Admin Orders Search Bar & Spacing', () => {
  test('search input has proper padding and spacing without icon overlap', async ({ page }) => {
    // Mock the /api/orders endpoint so the page renders orders
    await page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              order_id: 7,
              name: 'María',
              last_name: 'González',
              cedula: 'V-26345678',
              tlf_num: '+584146999670',
              total_amount: '18.50',
              status: 'pending',
              item_count: 3,
              created_at: '2026-08-13T14:30:00.000Z',
              delivery_type: 'envio_nacional',
              payment_method: 'pago_movil',
            },
            {
              order_id: 6,
              name: 'Sofía',
              last_name: 'Hernández',
              cedula: 'V-28111222',
              tlf_num: '+584147778899',
              total_amount: '15.50',
              status: 'approved',
              item_count: 1,
              created_at: '2026-08-14T08:10:00.000Z',
              delivery_type: 'delivery',
              payment_method: 'zelle',
            },
          ],
        }),
      });
    });

    // Navigate to admin orders page (with dev bypass enabled in dev mode)
    await page.goto('/tokki-admin/orders');

    // Wait for the search wrapper to appear
    const searchWrapper = page.locator('.orders-search-wrapper');
    await expect(searchWrapper).toBeVisible();

    const searchIcon = page.locator('.orders-search-icon');
    const searchInput = page.locator('.orders-search-input');

    await expect(searchIcon).toBeVisible();
    await expect(searchInput).toBeVisible();

    // Check computed styles
    const inputPaddingLeft = await searchInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingLeft);
    });

    const iconBox = await searchIcon.boundingBox();
    const inputBox = await searchInput.boundingBox();

    expect(iconBox).not.toBeNull();
    expect(inputBox).not.toBeNull();

    if (iconBox && inputBox) {
      // The icon's right edge relative to the input's left edge
      const iconRightRelativeToInput = iconBox.x + iconBox.width - inputBox.x;
      
      // Padding-left MUST be greater than the icon's right edge plus comfortable spacing (at least 8px buffer)
      expect(inputPaddingLeft).toBeGreaterThan(iconRightRelativeToInput + 6);
    }

    // Take screenshot of empty search bar with placeholder on desktop
    await searchWrapper.screenshot({ path: 'test-results/search-wrapper-empty-desktop.png' });

    // Type short text into search bar
    await searchInput.fill('V-26345678');
    await expect(searchInput).toHaveValue('V-26345678');

    // Clear button should be visible
    const clearButton = page.locator('.orders-search-clear');
    await expect(clearButton).toBeVisible();

    // Take screenshot of the search toolbar for visual verification
    await searchWrapper.screenshot({ path: 'test-results/search-wrapper-filled.png' });

    // Type very long text into search bar
    await searchInput.fill('Super long search query testing placeholder and boundary padding overlap issues 1234567890');
    await searchWrapper.screenshot({ path: 'test-results/search-wrapper-long-text.png' });

    // Click clear button
    await clearButton.click();
    await expect(searchInput).toHaveValue('');
    await expect(clearButton).not.toBeVisible();

    // Check tablet viewport (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await searchWrapper.screenshot({ path: 'test-results/search-wrapper-empty-tablet.png' });
  });

  test('admin product management search bar spacing and visual rendering', async ({ page }) => {
    // Mock /api/products
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              product_id: 1,
              product_name: 'Bálsamo Labial Bunny',
              price: '8.50',
              stock_quantity: 15,
              in_stock: true,
              category: 'Maquillaje',
              description: 'Bálsamo hidratante con diseño kawaii de conejito.',
              product_image_url: '/assets/sample.png',
            },
          ],
        }),
      });
    });

    await page.goto('/tokki-admin/products');

    const searchField = page.locator('.search-field');
    await expect(searchField).toBeVisible();

    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();

    await searchField.screenshot({ path: 'test-results/product-search-empty.png' });

    await searchInput.fill('Bálsamo Labial con texto largo para verificar padding y spacing');
    await searchField.screenshot({ path: 'test-results/product-search-filled.png' });
  });

  test('admin POS order creator product picker search bar spacing', async ({ page }) => {
    // Mock /api/products
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              product_id: 1,
              product_name: 'Bálsamo Labial Bunny',
              price: '8.50',
              stock_quantity: 15,
              in_stock: true,
              category: 'Maquillaje',
              description: 'Bálsamo hidratante con diseño kawaii de conejito.',
              product_image_url: '/assets/sample.png',
            },
          ],
        }),
      });
    });

    await page.goto('/tokki-admin/orders/new');

    const posSearchField = page.locator('.pos-search-field');
    await expect(posSearchField).toBeVisible();

    const posSearchInput = page.locator('.pos-search-input');
    await expect(posSearchInput).toBeVisible();

    await posSearchField.screenshot({ path: 'test-results/pos-search-empty.png' });

    await posSearchInput.fill('Bálsamo Labial con texto largo');
    await posSearchField.screenshot({ path: 'test-results/pos-search-filled.png' });
  });

  test('mobile viewport rendering of order search bar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              order_id: 7,
              name: 'María',
              last_name: 'González',
              cedula: 'V-26345678',
              tlf_num: '+584146999670',
              total_amount: '18.50',
              status: 'pending',
              item_count: 3,
              created_at: '2026-08-13T14:30:00.000Z',
              delivery_type: 'envio_nacional',
              payment_method: 'pago_movil',
            },
          ],
        }),
      });
    });

    await page.goto('/tokki-admin/orders');

    const searchWrapper = page.locator('.orders-search-wrapper');
    await expect(searchWrapper).toBeVisible();

    await searchWrapper.screenshot({ path: 'test-results/orders-search-mobile-empty.png' });

    const searchInput = page.locator('.orders-search-input');
    await searchInput.fill('V-26345678');
    await searchWrapper.screenshot({ path: 'test-results/orders-search-mobile-filled.png' });
  });
});
