import { test, expect } from '@playwright/test';

const MOCK_ORDERS = [
  {
    order_id: 21,
    name: 'María',
    last_name: 'González',
    cedula: 'V-26345678',
    tlf_num: '+584146999670',
    total_amount: '18.50',
    status: 'pending',
    item_count: 3,
    created_at: '2026-11-20T14:30:00.000Z',
    delivery_type: 'envio_nacional',
    payment_method: 'pago_movil',
  },
  {
    order_id: 20,
    name: 'Valeria',
    last_name: 'Rojas',
    cedula: 'V-27111222',
    tlf_num: '+584121234567',
    total_amount: '24.00',
    status: 'pending',
    item_count: 2,
    created_at: '2026-11-20T12:10:00.000Z',
    delivery_type: 'delivery',
    payment_method: 'binance',
  },
  {
    order_id: 19,
    name: 'Sofía',
    last_name: 'Hernández',
    cedula: 'V-28111222',
    tlf_num: '+584147778899',
    total_amount: '15.50',
    status: 'approved',
    item_count: 1,
    created_at: '2026-11-19T08:10:00.000Z',
    delivery_type: 'retiro_tienda',
    payment_method: 'zelle',
  },
  {
    order_id: 18,
    name: 'Carlos',
    last_name: 'Pérez',
    cedula: 'V-25999000',
    tlf_num: '+584129998877',
    total_amount: '9.00',
    status: 'canceled',
    item_count: 1,
    created_at: '2026-11-18T16:00:00.000Z',
    delivery_type: 'delivery',
    payment_method: 'cash',
  },
];

const MOCK_PRODUCTS = [
  {
    product_id: 101,
    product_name: 'Bálsamo Labial Fresa',
    product_price: '4.50',
    product_description: 'Hidratante kawaii sabor fresa',
    category: 'Maquillaje',
    qty_available: 10,
    in_stock: true,
    product_image_url: null,
    product_image_urls: [],
  },
  {
    product_id: 102,
    product_name: 'Pin Kawaii Bunny',
    product_price: '3.00',
    product_description: 'Pin esmaltado de conejito',
    category: 'Pines & Chapas',
    qty_available: 0,
    in_stock: false,
    product_image_url: null,
    product_image_urls: [],
  },
  {
    product_id: 103,
    product_name: 'Mochi Matcha',
    product_price: '2.50',
    product_description: 'Dulce japonés artesanal',
    category: 'Dulces & Comida Asiatica',
    qty_available: 2,
    in_stock: true,
    product_image_url: null,
    product_image_urls: [],
  },
];

test.describe('Admin Step 5 Quick Actions', () => {
  test('Orders status tabs show per-status counts with amber pending badge across viewports', async ({ page }, testInfo) => {
    await page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ORDERS }),
      });
    });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/tokki-admin/orders');
    await expect(page.getByText('#21')).toBeVisible({ timeout: 15000 });

    const allTab = page.getByRole('button', { name: /^todos$/i });
    const pendingTab = page.getByRole('button', { name: /^pendientes$/i });
    const approvedTab = page.getByRole('button', { name: /^aprobados$/i });
    const canceledTab = page.getByRole('button', { name: /^cancelados$/i });

    await expect(allTab.locator('.filter-tab-count')).toHaveText('4');
    await expect(pendingTab.locator('.filter-tab-count')).toHaveText('2');
    await expect(pendingTab.locator('.filter-tab-count')).toHaveClass(/filter-tab-count--pending/);
    await expect(approvedTab.locator('.filter-tab-count')).toHaveText('1');
    await expect(canceledTab.locator('.filter-tab-count')).toHaveText('1');

    await page.screenshot({ path: testInfo.outputPath('admin-orders-tabs-desktop.png') });

    await pendingTab.click();
    await expect(page.getByText('#21')).toBeVisible();
    await expect(page.getByText('#20')).toBeVisible();
    await expect(page.getByText('#19')).not.toBeVisible();
    await expect(page.getByText('#18')).not.toBeVisible();

    // All 4 tab counts stay anchored to total orders even while filtered
    await expect(allTab.locator('.filter-tab-count')).toHaveText('4');
    await expect(pendingTab.locator('.filter-tab-count')).toHaveText('2');
    await expect(approvedTab.locator('.filter-tab-count')).toHaveText('1');
    await expect(canceledTab.locator('.filter-tab-count')).toHaveText('1');

    // Mobile 375x667 overflow check
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(pendingTab).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    await page.screenshot({ path: testInfo.outputPath('admin-orders-tabs-mobile.png') });
  });

  test('Products inline stepper batches rapid taps, keeps ?stock=out card visible, rolls back failures, and fits mobile', async ({ page }, testInfo) => {
    const patchPayloads: Array<{ url: string; body: { qty_available?: number } }> = [];
    let failNextPatchForId103 = false;

    await page.route('**/api/products', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
        });
        return;
      }
      await route.continue();
    });

    await page.route('**/api/products/*', async (route) => {
      const req = route.request();
      if (req.method() === 'PATCH') {
        const body = req.postDataJSON() as { qty_available?: number };
        const url = req.url();
        patchPayloads.push({ url, body });

        if (failNextPatchForId103 && url.endsWith('/products/103')) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'Error de servidor al guardar stock' }),
          });
          return;
        }

        const idMatch = url.match(/\/products\/(\d+)$/);
        const productId = idMatch ? Number(idMatch[1]) : 102;
        const base = MOCK_PRODUCTS.find((p) => p.product_id === productId) ?? MOCK_PRODUCTS[1];
        const qty = body.qty_available ?? base.qty_available;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            updated_row: {
              ...base,
              qty_available: qty,
              in_stock: qty > 0,
            },
          }),
        });
        return;
      }

      await route.continue();
    });

    // 1) Start in ?stock=out with Pin Kawaii Bunny at 0
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/tokki-admin/products?stock=out');
    await expect(page.getByText('Pin Kawaii Bunny')).toBeVisible({ timeout: 15000 });

    const pinCard = page.locator('.product-card-admin', { hasText: 'Pin Kawaii Bunny' });
    const pinMinus = pinCard.getByRole('button', { name: /disminuir stock de pin kawaii bunny/i });
    const pinPlus = pinCard.getByRole('button', { name: /aumentar stock de pin kawaii bunny/i });
    const pinValue = pinCard.locator('.stock-stepper-value');

    await expect(pinMinus).toBeDisabled();
    await expect(pinValue).toHaveText('0');
    await expect(pinCard.locator('.stock-stepper-label')).toHaveText(/stock/i);
    await expect(pinCard.locator('.stock-stepper-label')).toBeVisible();
    await expect(pinCard.locator('.product-thumb-ribbon')).toHaveText('Agotado');

    // Rapidly click + 3 times
    await pinPlus.click();
    await pinPlus.click();
    await pinPlus.click();

    await expect(pinCard).toBeVisible();
    await expect(pinValue).toHaveText('3');
    await expect(pinCard.locator('.product-thumb-ribbon')).not.toBeVisible();

    await expect(page.getByRole('status')).toHaveText('Stock actualizado: 3');
    expect(patchPayloads).toHaveLength(1);
    expect(patchPayloads[0].url).toMatch(/\/api\/products\/102$/);
    expect(patchPayloads[0].body).toEqual({ qty_available: 3 });

    // 2) Switch to Todos to view all cards, verify desktop + mobile layout, and test failure rollback
    await page.getByRole('button', { name: /^todos$/i }).click();
    await expect(page.getByText('Bálsamo Labial Fresa')).toBeVisible();
    await expect(page.getByText('Mochi Matcha')).toBeVisible();
    await page.locator('.products-grid').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('admin-products-stepper-desktop.png') });

    failNextPatchForId103 = true;
    const mochiCard = page.locator('.product-card-admin', { hasText: 'Mochi Matcha' });
    const mochiPlus = mochiCard.getByRole('button', { name: /aumentar stock de mochi matcha/i });
    const mochiValue = mochiCard.locator('.stock-stepper-value');

    await expect(mochiValue).toHaveText('2');
    await mochiPlus.click();
    await expect(page.getByRole('status')).toHaveText('Error de servidor al guardar stock');
    await expect(mochiValue).toHaveText('2');

    // 3) Mobile 375x667 2-column grid layout & zero horizontal overflow
    await page.setViewportSize({ width: 375, height: 667 });
    await mochiCard.scrollIntoViewIfNeeded();
    await expect(mochiCard).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    await page.screenshot({ path: testInfo.outputPath('admin-products-stepper-mobile.png') });
  });
});
