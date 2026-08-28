import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Sales Analysis Charts', () => {
  test.beforeEach(async ({ page }) => {
    // Mock /api/orders
    await page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              order_id: 1,
              name: 'María',
              last_name: 'González',
              tlf_num: '+584146999670',
              total_amount: '18.50',
              status: 'approved',
              item_count: 3,
              created_at: '2026-08-04T14:30:00.000Z',
              delivery_type: 'envio_nacional',
              payment_method: 'pago_movil',
            },
            {
              order_id: 2,
              name: 'Sofía',
              last_name: 'Hernández',
              tlf_num: '+584147778899',
              total_amount: '35.00',
              status: 'approved',
              item_count: 2,
              created_at: '2026-08-12T08:10:00.000Z',
              delivery_type: 'delivery',
              payment_method: 'zelle',
            },
            {
              order_id: 3,
              name: 'Carlos',
              last_name: 'Pérez',
              tlf_num: '+584124445566',
              total_amount: '50.00',
              status: 'approved',
              item_count: 4,
              created_at: '2026-08-25T11:20:00.000Z',
              delivery_type: 'retiro_tienda',
              payment_method: 'binance',
            },
          ],
        }),
      });
    });

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
              name: 'Tokki Bunny Plush',
              product_name: 'Tokki Bunny Plush',
              price: '15.00',
              product_price: '15.00',
              category_id: 1,
              category_name: 'Peluches',
              category_slug: 'peluches',
              in_stock: true,
              qty_available: 10,
              image_url: '/assets/bunny.gif',
            },
          ],
        }),
      });
    });
  });

  test('renders all day, week, and month labels without skipping', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/tokki-admin');
    await page.waitForLoadState('networkidle');

    // 1) Verify Section title exists
    const title = page.locator('h2:has-text("Análisis de Ventas")');
    await expect(title).toBeVisible();

    const salesCard = page.locator('.chart-card').first();

    // 2) Days view: Verify daily ticks are rendered
    await expect(salesCard.getByText(/vie \d+|lun \d+|mar \d+|mié \d+|jue \d+|sáb \d+|dom \d+/i).first()).toBeVisible({ timeout: 15000 });

    // 3) Switch to Semanas view
    const semanasBtn = salesCard.locator('button.pill-btn:has-text("Semanas")');
    await semanasBtn.click();
    await expect(semanasBtn).toHaveClass(/pill-btn--active/);

    // Verify weekly date range format with dd/mm (e.g. "03/08" and "- 09/08" or "31/08 - 06/09")
    await expect(salesCard.getByText(/\d{2}\/\d{2}/i).first()).toBeVisible({ timeout: 10000 });

    // 4) Switch to Meses view
    const mesesBtn = salesCard.locator('button.pill-btn:has-text("Meses")');
    await mesesBtn.click();
    await expect(mesesBtn).toHaveClass(/pill-btn--active/);

    // Verify month labels are all rendered (interval=0 ensures no skipped months)
    await expect(salesCard.getByText('Ene')).toBeVisible({ timeout: 10000 });
    await expect(salesCard.getByText('Ago')).toBeVisible();
    await expect(salesCard.getByText('Dic')).toBeVisible();

    // 5) Metric toggle: Pedidos (#)
    const ordersBtn = salesCard.locator('button.pill-btn:has-text("Pedidos (#)")');
    await ordersBtn.click();
    await expect(ordersBtn).toHaveClass(/pill-btn--active/);

    // 6) Confirm zero critical errors
    const critical = consoleErrors.filter(
      (err) =>
        err.includes('Refused to apply style') ||
        err.includes('Unable to preload CSS') ||
        err.includes('Uncaught Error'),
    );
    expect(critical).toHaveLength(0);
  });

  test('mobile viewport rendering of sales charts and week ranges without clipping', async ({ page }) => {
    // 375x667 standard mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/tokki-admin');
    await page.waitForLoadState('networkidle');

    const salesCard = page.locator('.chart-card').first();
    await expect(salesCard).toBeVisible();

    // Switch to Semanas
    const semanasBtn = salesCard.locator('button.pill-btn:has-text("Semanas")');
    await semanasBtn.click();
    await expect(semanasBtn).toHaveClass(/pill-btn--active/);

    // Verify dd/mm ticks are visible and properly contained
    const ddmmTicks = salesCard.locator('text:has-text("/")');
    await expect(ddmmTicks.first()).toBeVisible({ timeout: 10000 });

    // Verify chart container width fits screen without horizontal page overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
