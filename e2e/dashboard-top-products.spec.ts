import { test, expect } from '@playwright/test';

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Bunny Kawaii Edición Limitada',
    product_price: '8.50',
    qty_available: 15,
    in_stock: true,
    category: 'Maquillaje',
    product_description: 'Bálsamo hidratante',
    product_image_url: null,
  },
  {
    product_id: 2,
    product_name: 'Sérum Vitamina C',
    product_price: '12.00',
    qty_available: 3,
    in_stock: true,
    category: 'Skincare',
    product_description: 'Sérum facial',
    product_image_url: null,
  },
  {
    product_id: 3,
    product_name: 'Collar Sakura Dorado',
    product_price: '6.50',
    qty_available: 0,
    in_stock: false,
    category: 'Accesorios',
    product_description: 'Collar',
    product_image_url: null,
  },
  {
    product_id: 4,
    product_name: 'Pines Set Corazón',
    product_price: '4.00',
    qty_available: 22,
    in_stock: true,
    category: 'Pines & Chapas',
    product_description: 'Set de pines',
    product_image_url: null,
  },
  {
    product_id: 5,
    product_name: 'Mochi Daifuku Pack',
    product_price: '5.50',
    qty_available: 8,
    in_stock: true,
    category: 'Dulces & Comida Asiatica',
    product_description: 'Pack de mochis',
    product_image_url: null,
  },
];

const TOP_BY_UNITS = [
  {
    product_id: 1,
    product_name: 'Bálsamo Labial Bunny Kawaii Edición Limitada',
    product_price: '8.50',
    qty_available: 15,
    in_stock: true,
    category: 'Maquillaje',
    product_image_urls: [],
    product_image_url: null,
    units_sold: 20,
    orders_count: 11,
    total_revenue: '170.00',
  },
  {
    product_id: 4,
    product_name: 'Pines Set Corazón',
    product_price: '4.00',
    qty_available: 22,
    in_stock: true,
    category: 'Pines & Chapas',
    product_image_urls: [],
    product_image_url: null,
    units_sold: 16,
    orders_count: 9,
    total_revenue: '64.00',
  },
  {
    product_id: 5,
    product_name: 'Mochi Daifuku Pack',
    product_price: '5.50',
    qty_available: 8,
    in_stock: true,
    category: 'Dulces & Comida Asiatica',
    product_image_urls: [],
    product_image_url: null,
    units_sold: 12,
    orders_count: 7,
    total_revenue: '66.00',
  },
  {
    product_id: 2,
    product_name: 'Sérum Vitamina C',
    product_price: '12.00',
    qty_available: 3,
    in_stock: true,
    category: 'Skincare',
    product_image_urls: [],
    product_image_url: null,
    units_sold: 10,
    orders_count: 8,
    total_revenue: '120.00',
  },
  {
    product_id: 3,
    product_name: 'Collar Sakura Dorado',
    product_price: '6.50',
    qty_available: 0,
    in_stock: false,
    category: 'Accesorios',
    product_image_urls: [],
    product_image_url: null,
    units_sold: 7,
    orders_count: 5,
    total_revenue: '45.50',
  },
];

const TOP_BY_REVENUE = [
  TOP_BY_UNITS[0],
  TOP_BY_UNITS[3], // Sérum $120.00
  TOP_BY_UNITS[2], // Mochi $66.00
  TOP_BY_UNITS[1], // Pines $64.00
  TOP_BY_UNITS[4], // Collar $45.50
];

const TOP_7D_REVENUE = [
  {
    ...TOP_BY_UNITS[3],
    units_sold: 5,
    orders_count: 4,
    total_revenue: '60.00',
  },
  TOP_BY_UNITS[0],
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
    item_count: 3,
    created_at: '2026-08-13T14:30:00.000Z',
    delivery_type: 'envio_nacional',
    payment_method: 'pago_movil',
  },
  {
    order_id: 11,
    name: 'Sofía',
    last_name: 'Hernández',
    cedula: 'V-25111222',
    tlf_num: '+584147778899',
    total_amount: '15.00',
    status: 'pending',
    item_count: 1,
    created_at: '2026-11-18T10:15:00.000Z',
    delivery_type: 'delivery',
    payment_method: 'zelle',
  },
];

const MOCK_ORDER_DETAIL = {
  order_id: 10,
  order_token: '550e8400-e29b-41d4-a716-446655440000',
  status: 'approved',
  delivery_type: 'envio_nacional',
  payment_method: 'pago_movil',
  client: {
    name: 'María',
    last_name: 'González',
    cedula: 'V-26345678',
    tlf_num: '+584146999670',
  },
  total_amount: '18.50',
  created_at: '2026-08-13T14:30:00.000Z',
  items: [
    {
      product_name: 'Sérum Vitamina C',
      product_qty: 1,
      product_price: '12.00',
      product_total: '12.00',
    },
  ],
};

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
    page.route('**/api/orders/10', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ORDER_DETAIL }),
      });
    }),
    page.route('**/api/analytics/top-products*', async (route) => {
      const url = new URL(route.request().url());
      const sort = url.searchParams.get('sort') ?? 'units';
      const period = url.searchParams.get('period') ?? 'all';
      const data =
        sort === 'revenue' && period === '7d'
          ? TOP_7D_REVENUE
          : sort === 'revenue'
            ? TOP_BY_REVENUE
            : TOP_BY_UNITS;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data }),
      });
    }),
  ]);
}

test.describe('Admin Dashboard — Top Products & Interactive Workflows', () => {
  test('mobile (375px): top product items stack vertically without overlap', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setupMocks(page);
    await page.goto('/tokki-admin');

    const topProductsCard = page.locator('.top-products-card');
    await expect(topProductsCard).toBeVisible();
    await topProductsCard.scrollIntoViewIfNeeded();

    const items = page.locator('.top-product-item');
    await expect(items).toHaveCount(5);

    const boxes = await items.evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      }),
    );

    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    }

    for (const box of boxes) {
      expect(box.height).toBeGreaterThan(30);
    }

    const firstItem = items.first();
    await firstItem.scrollIntoViewIfNeeded();

    const layout = await firstItem.evaluate((el) => {
      const left = el.querySelector('.tp-left');
      const right = el.querySelector('.tp-right');
      if (!left || !right) return null;
      const lr = left.getBoundingClientRect();
      const rr = right.getBoundingClientRect();
      return {
        leftBottom: lr.bottom,
        rightTop: rr.top,
        leftRight: lr.right,
        rightLeft: rr.left,
      };
    });

    expect(layout).not.toBeNull();
    if (layout) {
      expect(layout.rightTop).toBeGreaterThanOrEqual(layout.leftBottom - 1);
    }

    await topProductsCard.screenshot({ path: 'test-results/dashboard-top-products-mobile.png' });
  });

  test('tablet (768px): top product items display horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await setupMocks(page);
    await page.goto('/tokki-admin');

    const topProductsCard = page.locator('.top-products-card');
    await expect(topProductsCard).toBeVisible();
    await topProductsCard.scrollIntoViewIfNeeded();

    const items = page.locator('.top-product-item');
    await expect(items).toHaveCount(5);

    const firstItem = items.first();
    await firstItem.scrollIntoViewIfNeeded();

    const layout = await firstItem.evaluate((el) => {
      const left = el.querySelector('.tp-left');
      const right = el.querySelector('.tp-right');
      if (!left || !right) return null;
      const lr = left.getBoundingClientRect();
      const rr = right.getBoundingClientRect();
      return {
        leftBottom: lr.bottom,
        rightTop: rr.top,
        leftRight: lr.right,
        rightLeft: rr.left,
      };
    });

    expect(layout).not.toBeNull();
    if (layout) {
      expect(layout.rightLeft).toBeGreaterThanOrEqual(layout.leftRight - 1);
      expect(layout.rightTop).toBeLessThan(layout.leftBottom);
    }

    await topProductsCard.screenshot({ path: 'test-results/dashboard-top-products-tablet.png' });
  });

  test('desktop (1280px): top products card renders cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupMocks(page);
    await page.goto('/tokki-admin');

    const topProductsCard = page.locator('.top-products-card');
    await expect(topProductsCard).toBeVisible();
    await topProductsCard.scrollIntoViewIfNeeded();

    const items = page.locator('.top-product-item');
    await expect(items).toHaveCount(5);

    const sectionHeader = topProductsCard.locator('.section-header');
    await expect(sectionHeader).toBeVisible();

    const headerLayout = await sectionHeader.evaluate((el) => {
      const titleWrap = el.querySelector('.section-header-title-wrap');
      const link = el.querySelector('.section-link-action');
      if (!titleWrap || !link) return null;
      const tr = titleWrap.getBoundingClientRect();
      const lr = link.getBoundingClientRect();
      return { titleLeft: tr.left, linkLeft: lr.left };
    });

    expect(headerLayout).not.toBeNull();
    if (headerLayout) {
      expect(headerLayout.linkLeft).toBeGreaterThan(headerLayout.titleLeft);
    }

    await topProductsCard.screenshot({ path: 'test-results/dashboard-top-products-desktop.png' });
  });

  test('desktop (1280px): toggles ranking filters and links Editar, Pedidos Recientes, and Alertas Stock', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupMocks(page);
    await page.goto('/tokki-admin');

    const topProductsCard = page.locator('.top-products-card');
    await expect(topProductsCard).toBeVisible();

    // Toggle to Ingresos ($) and 7d and wait for matching API request
    const [reqPromise] = await Promise.all([
      page.waitForRequest((req) =>
        req.url().includes('/api/analytics/top-products') &&
        req.url().includes('sort=revenue') &&
        req.url().includes('period=7d'),
      ),
      (async () => {
        await topProductsCard.getByRole('button', { name: 'Ingresos ($)' }).click();
        await topProductsCard.getByRole('button', { name: '7d' }).click();
      })(),
    ]);
    expect(reqPromise.url()).toContain('limit=5');

    // #1 item updates to Sérum Vitamina C (id=2)
    const firstItem = topProductsCard.locator('.top-product-item').first();
    await expect(firstItem).toContainText('Sérum Vitamina C');

    // Clicking Editar opens /tokki-admin/products?edit=2 with the edit modal open
    await firstItem.getByRole('link', { name: /Editar Sérum Vitamina C/i }).click();
    await expect(page).toHaveURL(/\/tokki-admin\/products\?edit=2$/);
    await expect(page.getByRole('heading', { name: 'Editar Producto' })).toBeVisible();
    await expect(page.getByLabel('Nombre del Producto')).toHaveValue('Sérum Vitamina C');

    // Navigate back to dashboard and test Pedidos Recientes row navigation
    await page.goto('/tokki-admin');
    await page.locator('.recent-order-link').first().click();
    await expect(page).toHaveURL(/\/tokki-admin\/orders\/10$/);
    await expect(page.getByRole('heading', { name: 'Pedido #10', level: 1 })).toBeVisible();

    // Navigate back to dashboard and test Alertas Stock combined ?stock=alert filter
    await page.goto('/tokki-admin');
    await page.getByRole('link', { name: /ver alertas de stock/i }).click();
    await expect(page).toHaveURL(/\/tokki-admin\/products\?stock=alert$/);
    await expect(page.getByText('Sérum Vitamina C')).toBeVisible();
    await expect(page.getByText('Collar Sakura Dorado')).toBeVisible();
    await expect(page.getByText('Bálsamo Labial Bunny Kawaii Edición Limitada')).not.toBeVisible();
  });

  test('quick actions, pending banner deep-link, and overview layout across desktop & mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setupMocks(page);
    await page.goto('/tokki-admin');

    const pendingBanner = page.getByRole('link', {
      name: /tienes 1 pedido pendiente por revisar/i,
    });
    await expect(pendingBanner).toBeVisible();
    await expect(pendingBanner).toContainText('$15.00 por cobrar');

    await page.screenshot({ path: 'test-results/admin-dashboard-overview-desktop.png' });

    // + Agregar Producto opens /tokki-admin/products?new=1 with Nuevo Producto modal
    await page.getByRole('link', { name: '+ Agregar Producto' }).click();
    await expect(page).toHaveURL(/\/tokki-admin\/products\?new=1$/);
    await expect(page.getByRole('heading', { name: 'Nuevo Producto' })).toBeVisible();

    // Pending banner opens /tokki-admin/orders?status=pending pre-filtered
    await page.goto('/tokki-admin');
    await page.getByRole('link', { name: /tienes 1 pedido pendiente por revisar/i }).click();
    await expect(page).toHaveURL(/\/tokki-admin\/orders\?status=pending$/);
    await expect(page.getByRole('button', { name: /^pendientes$/i })).toHaveClass(/active/);
    await expect(page.getByText('Sofía Hernández')).toBeVisible();
    await expect(page.getByText('María González')).not.toBeVisible();

    // Mobile overview layout check + screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/tokki-admin');
    await expect(page.getByRole('link', { name: '+ Nuevo Pedido' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
    await page.screenshot({ path: 'test-results/admin-dashboard-overview-mobile.png' });
  });
});
