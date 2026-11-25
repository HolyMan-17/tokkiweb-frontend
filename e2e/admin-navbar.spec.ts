import { test, expect } from '@playwright/test';

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Bunny Kawaii',
    product_price: '8.50',
    qty_available: 15,
    in_stock: true,
    category: 'Maquillaje',
    product_description: 'Bálsamo hidratante',
    product_image_url: null,
  },
];

const MOCK_ORDERS = [
  {
    order_id: 10,
    name: 'María',
    last_name: 'González',
    cedula: 'V-26345678',
    tlf_num: '+584146999670',
    total_amount: '18.50',
    status: 'approved',
    item_count: 1,
    created_at: '2026-08-13T14:30:00.000Z',
    delivery_type: 'envio_nacional',
    payment_method: 'pago_movil',
  },
];

function setupMocks(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
      });
    }),
    page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ORDERS }),
      });
    }),
    page.route('**/api/analytics/top-products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }),
  ]);
}

test.describe('Admin Navbar — Dashboard Button & Active Highlight', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('desktop (1280px): navigates to dashboard via navbar button and highlights active route', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/tokki-admin/orders');

    const header = page.locator('header.top-nav-admin');
    const dashboardBtn = header.getByRole('link', { name: 'Panel de control', exact: true });
    const ordersBtn = header.getByRole('link', { name: 'Pedidos', exact: true });
    const productsBtn = header.getByRole('link', { name: 'Productos', exact: true });

    await expect(ordersBtn).toHaveAttribute('aria-current', 'page');
    await expect(ordersBtn).toHaveClass(/nav-icon-btn--active/);
    await expect(dashboardBtn).not.toHaveAttribute('aria-current', 'page');
    await expect(dashboardBtn).not.toHaveClass(/nav-icon-btn--active/);

    // Clicking the dedicated Dashboard icon navigates to /tokki-admin and activates it
    await dashboardBtn.click();
    await expect(page).toHaveURL(/\/tokki-admin$/);
    await expect(page.getByRole('heading', { name: /Panel de Control/i })).toBeVisible();
    await expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
    await expect(dashboardBtn).toHaveClass(/nav-icon-btn--active/);
    await expect(ordersBtn).not.toHaveAttribute('aria-current', 'page');
    await expect(ordersBtn).not.toHaveClass(/nav-icon-btn--active/);

    // Verify no overlap between logo and actions and capture screenshot while on dashboard
    const headerMetrics = await header.evaluate((el) => {
      const logo = el.querySelector('.nav-logo');
      const actions = el.querySelector('.nav-actions');
      if (!logo || !actions) return null;
      const lr = logo.getBoundingClientRect();
      const ar = actions.getBoundingClientRect();
      return {
        logoRight: lr.right,
        actionsLeft: ar.left,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    expect(headerMetrics).not.toBeNull();
    if (headerMetrics) {
      expect(headerMetrics.actionsLeft).toBeGreaterThanOrEqual(headerMetrics.logoRight - 1);
      expect(headerMetrics.scrollWidth).toBeLessThanOrEqual(headerMetrics.clientWidth + 2);
    }

    await header.screenshot({ path: testInfo.outputPath('admin-navbar-desktop.png') });

    // Clicking Productos highlights only Productos
    await productsBtn.click();
    await expect(page).toHaveURL(/\/tokki-admin\/products$/);
    await expect(productsBtn).toHaveAttribute('aria-current', 'page');
    await expect(productsBtn).toHaveClass(/nav-icon-btn--active/);
    await expect(dashboardBtn).not.toHaveAttribute('aria-current', 'page');
    await expect(dashboardBtn).not.toHaveClass(/nav-icon-btn--active/);

    // Navigating to /tokki-admin/orders/new highlights Pedidos, not Dashboard
    await page.goto('/tokki-admin/orders/new');
    await expect(ordersBtn).toHaveAttribute('aria-current', 'page');
    await expect(ordersBtn).toHaveClass(/nav-icon-btn--active/);
    await expect(dashboardBtn).not.toHaveAttribute('aria-current', 'page');
    await expect(dashboardBtn).not.toHaveClass(/nav-icon-btn--active/);
  });

  test('mobile (375px & 360px): all admin navbar buttons fit cleanly without clipping or overlap', async ({ page }, testInfo) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 360, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/tokki-admin');

      const header = page.locator('header.top-nav-admin');
      const logoText = header.locator('.logo-text');
      const logoStore = header.locator('.logo-store');
      const dashboardBtn = header.getByRole('link', { name: 'Panel de control', exact: true });
      const ordersBtn = header.getByRole('link', { name: 'Pedidos', exact: true });
      const productsBtn = header.getByRole('link', { name: 'Productos', exact: true });
      const logoutBtn = header.getByRole('link', { name: 'Volver a la tienda', exact: true });

      await expect(logoText).toBeVisible();
      await expect(logoText).toHaveText('Tokki Shop');
      await expect(logoStore).toBeVisible();
      await expect(logoStore).toHaveText(/admin/i);
      await expect(dashboardBtn).toBeVisible();
      await expect(dashboardBtn).toHaveAttribute('aria-current', 'page');
      await expect(dashboardBtn).toHaveClass(/nav-icon-btn--active/);
      await expect(ordersBtn).toBeVisible();
      await expect(productsBtn).toBeVisible();
      await expect(logoutBtn).toBeVisible();

      const metrics = await header.evaluate((el) => {
        const logo = el.querySelector('.nav-logo');
        const text = el.querySelector('.logo-text');
        const store = el.querySelector('.logo-store');
        const actions = el.querySelector('.nav-actions');
        const buttons = Array.from(el.querySelectorAll('.nav-actions a')).map((a) => {
          const r = a.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width, height: r.height };
        });
        if (!logo || !text || !store || !actions) return null;
        const lr = logo.getBoundingClientRect();
        const tr = text.getBoundingClientRect();
        const sr = store.getBoundingClientRect();
        const ar = actions.getBoundingClientRect();
        return {
          logoRight: lr.right,
          textBox: { left: tr.left, right: tr.right, width: tr.width, height: tr.height },
          storeBox: { left: sr.left, right: sr.right, width: sr.width, height: sr.height },
          actionsLeft: ar.left,
          viewportWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          buttons,
        };
      });

      expect(metrics).not.toBeNull();
      if (metrics) {
        expect(metrics.textBox.width).toBeGreaterThan(0);
        expect(metrics.textBox.height).toBeGreaterThan(0);
        expect(metrics.textBox.left).toBeGreaterThanOrEqual(0);
        expect(metrics.textBox.right).toBeLessThanOrEqual(metrics.actionsLeft + 1);
        expect(metrics.storeBox.width).toBeGreaterThan(0);
        expect(metrics.storeBox.height).toBeGreaterThan(0);
        expect(metrics.storeBox.left).toBeGreaterThanOrEqual(0);
        expect(metrics.storeBox.right).toBeLessThanOrEqual(metrics.actionsLeft + 1);
        expect(metrics.actionsLeft).toBeGreaterThanOrEqual(metrics.logoRight - 1);
        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
        for (const btn of metrics.buttons) {
          expect(btn.left).toBeGreaterThanOrEqual(0);
          expect(btn.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
          expect(btn.width).toBeGreaterThanOrEqual(30);
        }
      }

      if (viewport.width === 375) {
        await header.screenshot({ path: testInfo.outputPath('admin-navbar-mobile.png') });
      }
      if (viewport.width === 360) {
        await header.screenshot({ path: testInfo.outputPath('admin-navbar-mobile-360.png') });
      }
    }
  });
});
