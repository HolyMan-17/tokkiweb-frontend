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
    category: 'Dulces Asiáticos',
    product_description: 'Pack de mochis',
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
    item_count: 3,
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
  ]);
}

test.describe('Admin Dashboard — Top Products / Inventario Layout', () => {
  test('mobile (375px): top product items stack vertically without overlap', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await setupMocks(page);
    await page.goto('/tokki-admin');

    // Wait for the top products section to render
    const topProductsCard = page.locator('.top-products-card');
    await expect(topProductsCard).toBeVisible();

    // Scroll the card into view so bounding boxes are calculable
    await topProductsCard.scrollIntoViewIfNeeded();

    // Verify all 5 product items render
    const items = page.locator('.top-product-item');
    await expect(items).toHaveCount(5);

    // Verify no items overlap vertically: each item's top should be >= previous item's bottom
    const boxes = await items.evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      }),
    );

    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    }

    // Each item should have a reasonable height (not collapsed)
    for (const box of boxes) {
      expect(box.height).toBeGreaterThan(30);
    }

    // On mobile (stacked column), tp-left and tp-right within first item
    // should stack vertically: tp-right's top >= tp-left's bottom
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
      // On mobile (stacked), tp-right should be below tp-left
      expect(layout.rightTop).toBeGreaterThanOrEqual(layout.leftBottom - 1);
    }

    // Screenshots for visual verification
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

    // On tablet (640px+), tp-left and tp-right should be on the same row
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
      // On tablet, tp-right should be to the right of tp-left (same row)
      expect(layout.rightLeft).toBeGreaterThanOrEqual(layout.leftRight - 1);
      // And vertically overlapping (same row)
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

    // Section header: title and link should be on the same row
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
});
