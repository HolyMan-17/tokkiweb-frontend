import { test, expect } from '@playwright/test';

test.describe('Global Search Bar — Desktop & Mobile Interaction', () => {
  test('desktop (1280px): inline pill, opens novedades on focus, filters live suggestions, navigates to PDP on item click', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Mock products API
    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              product_id: 1,
              product_name: 'Gloss Mágico Bunny',
              product_price: '5.50',
              product_description: 'Brillo labial hidratante.',
              qty_available: 10,
              in_stock: true,
              category: 'Maquillaje',
              product_image_url: null,
            },
            {
              product_id: 2,
              product_name: 'Mochi Fresa Cream',
              product_price: '3.50',
              product_description: 'Dulce tradicional relleno de crema.',
              qty_available: 8,
              in_stock: true,
              category: 'Dulces & Comida Asiatica',
              product_image_url: null,
            },
          ],
        }),
      });
    });

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /buscar producto/i });
    await expect(searchInput).toBeVisible();

    // Focus input -> displays Novedades
    await searchInput.focus();
    await expect(page.getByText(/últimas novedades/i)).toBeVisible();
    const listbox = page.locator('#tokki-search-listbox');
    await expect(listbox.getByText('Mochi Fresa Cream')).toBeVisible();

    // Type query
    await searchInput.fill('Gloss');
    await expect(listbox.getByText('Gloss Mágico Bunny')).toBeVisible();
    await expect(listbox.getByText('$5.50')).toBeVisible();

    // Click on product suggestion -> goes to /products/1
    await page.getByRole('option', { name: /gloss mágico bunny/i }).click();
    await expect(page).toHaveURL(/\/products\/1/);
  });

  test('desktop (1280px): pressing Enter navigates to /productos?q=...', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              product_id: 2,
              product_name: 'Mochi Fresa Cream',
              product_price: '3.50',
              product_description: 'Dulce tradicional relleno de crema.',
              qty_available: 8,
              in_stock: true,
              category: 'Dulces & Comida Asiatica',
              product_image_url: null,
            },
          ],
        }),
      });
    });

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /buscar producto/i });
    await searchInput.fill('mochi');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/\/productos\?q=mochi/);
    await expect(page.locator('.category-grid').getByText('Mochi Fresa Cream')).toBeVisible();
  });

  test('mobile (375px): circular trigger opens full-screen overlay, Cancel button closes it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              product_id: 2,
              product_name: 'Mochi Fresa Cream',
              product_price: '3.50',
              product_description: 'Dulce tradicional relleno de crema.',
              qty_available: 8,
              in_stock: true,
              category: 'Dulces & Comida Asiatica',
              product_image_url: null,
            },
          ],
        }),
      });
    });

    await page.goto('/');

    // Mobile trigger is visible, search pill is not open yet
    const triggerBtn = page.getByRole('button', { name: /abrir búsqueda/i });
    await expect(triggerBtn).toBeVisible();

    const cancelBtn = page.getByRole('button', { name: /cancelar/i });
    await expect(cancelBtn).not.toBeVisible();

    // Click trigger opens overlay
    await triggerBtn.click();
    await expect(cancelBtn).toBeVisible();

    const searchInput = page.getByRole('combobox', { name: /buscar producto/i });
    await expect(searchInput).toBeFocused();

    // Click Cancel closes overlay
    await cancelBtn.click();
    await expect(cancelBtn).not.toBeVisible();
  });
});
