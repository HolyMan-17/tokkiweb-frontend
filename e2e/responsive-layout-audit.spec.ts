import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORIES } from '../src/constants';

const SAMPLE_PNG = readFileSync(join(process.cwd(), 'public/favicon-192x192.png'));

const SCREENSHOT_VIEWPORTS = new Set(['mobile-360', 'tablet-768', 'desktop-1680']);

const MOCK_PRODUCTS = CATEGORIES.map((cat, idx) => {
  const id = idx + 1;
  const isOut = idx % 7 === 0;
  const isLow = idx % 5 === 1;
  const qty = isOut ? 0 : isLow ? 2 : 12 + idx;
  const hasImage = idx % 4 !== 3;
  const gallery =
    id === 1
      ? ['/images/products/sample-1.png', '/images/products/sample-2.png', '/images/products/sample-3.png']
      : hasImage
        ? [`/images/products/sample-${(idx % 3) + 1}.png`]
        : [];

  return {
    product_id: id,
    product_name: `${cat.name} Tokki Edición Especial #${id}`,
    product_price: (3.5 + idx * 1.25).toFixed(2),
    discount_percent: id === 1 ? 20 : idx % 3 === 1 ? 15 : 0,
    product_description: `Descripción kawaii de prueba para ${cat.name} en Tokki Shop.`,
    category: cat.name,
    qty_available: qty,
    in_stock: qty > 0,
    product_image_urls: gallery,
    product_image_url: gallery[0] ?? null,
  };
});

const MOCK_ORDERS = [
  {
    order_id: 21,
    name: 'María',
    last_name: 'González',
    cedula: 'V-26345678',
    tlf_num: '+584146999670',
    total_amount: '24.50',
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
    total_amount: '18.00',
    status: 'approved',
    item_count: 2,
    created_at: '2026-11-19T12:10:00.000Z',
    delivery_type: 'delivery',
    payment_method: 'binance',
  },
  {
    order_id: 19,
    name: 'Carlos',
    last_name: 'Pérez',
    cedula: 'V-25999000',
    tlf_num: '+584129998877',
    total_amount: '9.50',
    status: 'canceled',
    item_count: 1,
    created_at: '2026-11-18T16:00:00.000Z',
    delivery_type: 'retiro_tienda',
    payment_method: 'cash',
  },
];

const ORDER_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

const MOCK_ORDER_DETAIL = {
  order_id: 21,
  order_token: ORDER_TOKEN,
  status: 'pending',
  delivery_type: 'envio_nacional',
  payment_method: 'pago_movil',
  client: {
    name: 'María',
    last_name: 'González',
    cedula: 'V-26345678',
    tlf_num: '+584146999670',
  },
  total_amount: '24.50',
  created_at: '2026-11-20T14:30:00.000Z',
  items: [
    {
      product_id: 2,
      product_name: MOCK_PRODUCTS[1].product_name,
      product_qty: 2,
      product_price: MOCK_PRODUCTS[1].product_price,
      product_total: (Number(MOCK_PRODUCTS[1].product_price) * 2).toFixed(2),
    },
    {
      product_id: 3,
      product_name: MOCK_PRODUCTS[2].product_name,
      product_qty: 1,
      product_price: MOCK_PRODUCTS[2].product_price,
      product_total: MOCK_PRODUCTS[2].product_price,
    },
  ],
};

const TOP_PRODUCTS = MOCK_PRODUCTS.slice(1, 6).map((p, idx) => ({
  product_id: p.product_id,
  product_name: p.product_name,
  product_price: p.product_price,
  discount_percent: p.discount_percent,
  qty_available: p.qty_available,
  in_stock: p.in_stock,
  category: p.category,
  product_image_urls: p.product_image_urls,
  product_image_url: p.product_image_url,
  units_sold: 20 - idx * 3,
  orders_count: 10 - idx,
  total_revenue: ((20 - idx * 3) * Number(p.product_price)).toFixed(2),
}));

async function setupApiAndImageMocks(page: Page) {
  await page.route('**/images/products/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: SAMPLE_PNG,
    });
  });

  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
    });
  });

  await page.route(/\/api\/products\/\d+$/, async (route) => {
    const match = route.request().url().match(/\/products\/(\d+)$/);
    const id = match ? Number(match[1]) : 1;
    const found = MOCK_PRODUCTS.find((p) => p.product_id === id) ?? MOCK_PRODUCTS[0];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: found }),
    });
  });

  await page.route('**/api/orders', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_ORDERS }),
    });
  });

  await page.route('**/api/orders/receipt/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_ORDER_DETAIL }),
    });
  });

  await page.route(/\/api\/orders\/\d+$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_ORDER_DETAIL }),
    });
  });

  await page.route('**/api/analytics/top-products*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: TOP_PRODUCTS }),
    });
  });
}

async function seedCart(page: Page) {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem('tokki_cart_v1', value);
  }, JSON.stringify([
    { product: MOCK_PRODUCTS[1], quantity: 2 },
    { product: MOCK_PRODUCTS[2], quantity: 1 },
  ]));
}

interface LayoutFindings {
  docOverflow: { docScrollW: number; bodyScrollW: number; clientW: number };
  brokenImages: Array<{ src: string; className: string; width: number; height: number }>;
  overflowingImages: Array<{ src: string; className: string; right: number; viewportW: number }>;
  distortedImages: Array<{ src: string; className: string; ratioDiff: number; w: number; h: number }>;
  headerOverlaps: Array<{ a: string; b: string; w: number; h: number }>;
  headerOutOfBounds: Array<{ label: string; left: number; right: number; viewportW: number }>;
  interactiveOverlaps: Array<{ a: string; b: string; w: number; h: number }>;
  iconOverlaps: Array<{ iconClass: string; target: string; w: number; h: number }>;
  iconBleeds: Array<{ iconClass: string; left: number; right: number; viewportW: number }>;
}

async function auditPageLayout(
  page: Page,
  routeLabel: string,
  viewportName: string,
  takeScreenshot: boolean,
  testInfo: TestInfo,
  pageErrors: string[],
  failedAssets: string[],
) {
  // Settle initial lazy routes & async loads deterministically
  await page.waitForLoadState('load');
  await page
    .waitForFunction(
      () => {
        const root = document.getElementById('root');
        if (!root || root.children.length === 0) return false;
        return !document.querySelector(
          '.auth-gate--loading, .spinner-full-page, .spinner-container, .catalog-skeleton-wrapper',
        );
      },
      undefined,
      { timeout: 5000 },
    )
    .catch(() => {});
  if (routeLabel === 'admin-products-edit-modal') {
    await page.locator('.modal-content').waitFor({ state: 'visible', timeout: 5000 });
  }
  await page.evaluate(async () => {
    for (let pass = 0; pass < 2; pass++) {
      const imgs = Array.from(document.querySelectorAll('img'));
      for (const img of imgs) {
        if (img.loading === 'lazy') {
          img.loading = 'eager';
        }
      }
      await Promise.all([
        document.fonts?.ready ?? Promise.resolve(),
        ...imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              const timer = window.setTimeout(resolve, 4000);
              img.addEventListener('load', () => { window.clearTimeout(timer); resolve(); }, { once: true });
              img.addEventListener('error', () => { window.clearTimeout(timer); resolve(); }, { once: true });
            }),
        ),
      ]);
    }
    const finiteAnimations = document.getAnimations().filter((anim) => {
      const timing = anim.effect?.getComputedTiming();
      return timing && Number.isFinite(timing.iterations) && anim.playState === 'running';
    });
    if (finiteAnimations.length > 0) {
      await Promise.race([
        Promise.allSettled(finiteAnimations.map((a) => a.finished)),
        new Promise<void>((resolve) => window.setTimeout(resolve, 300)),
      ]);
    }
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });

  const findings = await page.evaluate((): LayoutFindings => {
    const viewportW = document.documentElement.clientWidth;
    const docScrollW = document.documentElement.scrollWidth;
    const bodyScrollW = document.body.scrollWidth;

    const isVisible = (el: Element): boolean => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    };

    const isInsideHorizScroller = (el: Element): boolean => {
      let cur: Element | null = el.parentElement;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        const s = window.getComputedStyle(cur);
        if (
          (s.overflowX === 'auto' || s.overflowX === 'scroll') &&
          cur.scrollWidth > cur.clientWidth + 2
        ) {
          return true;
        }
        cur = cur.parentElement;
      }
      return false;
    };

    const isFixedHeroOrClippedBg = (el: Element): boolean => {
      let cur: Element | null = el;
      while (cur) {
        const s = window.getComputedStyle(cur);
        if (cur.classList.contains('hero-bg-layer') || cur.classList.contains('hero-bunnies')) {
          return true;
        }
        if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowX === 'clip') {
          return false;
        }
        cur = cur.parentElement;
      }
      return false;
    };

    const describeEl = (el: Element): string => {
      const tag = el.tagName.toLowerCase();
      const aria = el.getAttribute('aria-label');
      const txt = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28);
      const cls = typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '';
      return `${tag}${cls ? `.${cls}` : ''}[${aria || txt || 'no-text'}]`;
    };

    const intersect = (a: DOMRect, b: DOMRect) => {
      const x1 = Math.max(a.left, b.left);
      const y1 = Math.max(a.top, b.top);
      const x2 = Math.min(a.right, b.right);
      const y2 = Math.min(a.bottom, b.bottom);
      return { w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
    };

    const brokenImages: LayoutFindings['brokenImages'] = [];
    const overflowingImages: LayoutFindings['overflowingImages'] = [];
    const distortedImages: LayoutFindings['distortedImages'] = [];

    for (const img of Array.from(document.querySelectorAll('img'))) {
      if (!isVisible(img)) continue;
      const rect = img.getBoundingClientRect();
      if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
        brokenImages.push({
          src: img.currentSrc || img.getAttribute('src') || '(none)',
          className: img.className,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        continue;
      }

      if (
        (rect.right > viewportW + 2 || rect.left < -2) &&
        !isInsideHorizScroller(img) &&
        !isFixedHeroOrClippedBg(img)
      ) {
        overflowingImages.push({
          src: img.currentSrc || img.getAttribute('src') || '',
          className: img.className,
          right: Math.round(rect.right),
          viewportW,
        });
      }

      const style = window.getComputedStyle(img);
      if (style.objectFit === 'fill' && !img.closest('.hero-bg-layer')) {
        const renderedRatio = rect.width / rect.height;
        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const ratioDiff = Math.max(renderedRatio / naturalRatio, naturalRatio / renderedRatio);
        if (ratioDiff > 1.35) {
          distortedImages.push({
            src: img.currentSrc || img.getAttribute('src') || '',
            className: img.className,
            ratioDiff: Number(ratioDiff.toFixed(2)),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          });
        }
      }
    }

    // Header / Nav bounds and overlap checks
    const headerOverlaps: LayoutFindings['headerOverlaps'] = [];
    const headerOutOfBounds: LayoutFindings['headerOutOfBounds'] = [];
    const header = document.querySelector('header');
    if (header && isVisible(header)) {
      const items = Array.from(
        header.querySelectorAll('a, button, .catalog-logo-btn, .brand-logo'),
      ).filter((el) => isVisible(el));
      for (const el of items) {
        const r = el.getBoundingClientRect();
        if (r.right > viewportW + 2 || r.left < -2) {
          headerOutOfBounds.push({
            label: describeEl(el),
            left: Math.round(r.left),
            right: Math.round(r.right),
            viewportW,
          });
        }
      }
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (items[i].contains(items[j]) || items[j].contains(items[i])) continue;
          const rA = items[i].getBoundingClientRect();
          const rB = items[j].getBoundingClientRect();
          const { w, h } = intersect(rA, rB);
          if (w > 2 && h > 2) {
            headerOverlaps.push({
              a: describeEl(items[i]),
              b: describeEl(items[j]),
              w: Math.round(w),
              h: Math.round(h),
            });
          }
        }
      }
    }

    // Interactive overlaps check (scoped to modal when open)
    const modal = document.querySelector('.modal-content');
    const isModalOpen = Boolean(modal && isVisible(modal));
    if (isModalOpen && modal) {
      // Scroll to bottom so the last field and sticky .modal-actions settle naturally
      modal.scrollTop = modal.scrollHeight;
    }

    const getHorizontallyClippedRect = (el: Element): DOMRect | null => {
      const raw = el.getBoundingClientRect();
      let left = raw.left;
      let right = raw.right;
      let cur: Element | null = el.parentElement;
      while (cur && cur !== document.body && cur !== document.documentElement) {
        const s = window.getComputedStyle(cur);
        if (s.overflowX === 'auto' || s.overflowX === 'scroll') {
          const cr = cur.getBoundingClientRect();
          left = Math.max(left, cr.left);
          right = Math.min(right, cr.right);
          if (right <= left + 1) return null;
        }
        cur = cur.parentElement;
      }
      return new DOMRect(left, raw.top, right - left, raw.height);
    };

    const rootScope = isModalOpen && modal ? modal : document.body;
    const interactiveRects = new Map<Element, DOMRect>();
    const interactiveEls = Array.from(
      rootScope.querySelectorAll('button, a, input:not([type="hidden"]), select, textarea'),
    ).filter((el) => {
      if (!isVisible(el)) return false;
      if (el.classList.contains('order-card-stretched-link')) return false;
      if (el.classList.contains('visually-hidden')) return false;
      const r = getHorizontallyClippedRect(el);
      if (!r) return false;
      // For a scrollable modal, ignore elements currently scrolled out of the visible scrollbox above .modal-content's top
      if (isModalOpen && modal) {
        const mRect = modal.getBoundingClientRect();
        if (r.bottom <= mRect.top + 1 || r.top >= mRect.bottom - 1) return false;
      }
      if (r.width <= 4 || r.height <= 4) return false;
      interactiveRects.set(el, r);
      return true;
    });

    const interactiveOverlaps: LayoutFindings['interactiveOverlaps'] = [];
    for (let i = 0; i < interactiveEls.length; i++) {
      for (let j = i + 1; j < interactiveEls.length; j++) {
        const a = interactiveEls[i];
        const b = interactiveEls[j];
        if (a.contains(b) || b.contains(a)) continue;
        // Skip fields above a sticky .modal-actions bar if occluded mid-scroll, except after scrolling to bottom they must not overlap;
        // also check at top scroll separately if needed. Here at bottom scroll, fields inside .modal-body scrolled above the top of .modal-content
        // might sit under .modal-actions only if margin/padding is broken.
        if (isModalOpen) {
          const inBodyA = Boolean(a.closest('.modal-body'));
          const inActionsB = Boolean(b.closest('.modal-actions'));
          const inBodyB = Boolean(b.closest('.modal-body'));
          const inActionsA = Boolean(a.closest('.modal-actions'));
          if ((inBodyA && inActionsB) || (inBodyB && inActionsA)) {
            const actionsEl = modal?.querySelector('.modal-actions');
            const actionsRect = actionsEl?.getBoundingClientRect();
            const fieldEl = inBodyA ? a : b;
            const fRect = fieldEl.getBoundingClientRect();
            // Only flag if field isn't above the sticky footer OR doesn't fit cleanly above it
            if (actionsRect && fRect.bottom > actionsRect.top + 2 && fRect.top < actionsRect.top) {
              // Real overlap of the currently visible field into sticky bar
            } else {
              continue;
            }
          }
        }
        const rA = interactiveRects.get(a)!;
        const rB = interactiveRects.get(b)!;
        const { w, h } = intersect(rA, rB);
        if (w > 2 && h > 2) {
          interactiveOverlaps.push({
            a: describeEl(a),
            b: describeEl(b),
            w: Math.round(w),
            h: Math.round(h),
          });
        }
      }
    }

    if (isModalOpen && modal) {
      const actionsEl = modal.querySelector('.modal-actions');
      const floatingAdd = modal.querySelector('.images-carousel-floating-add');
      if (actionsEl && floatingAdd) {
        const actionsZ = Number(window.getComputedStyle(actionsEl).zIndex) || 0;
        const addZ = Number(window.getComputedStyle(floatingAdd).zIndex) || 0;
        if (actionsZ <= addZ) {
          interactiveOverlaps.push({
            a: '.modal-actions(z=' + actionsZ + ')',
            b: '.images-carousel-floating-add(z=' + addZ + ')',
            w: 10,
            h: 10,
          });
        }
      }
      modal.scrollTop = 0;
    }

    // Category icon check: never overlap sibling heading/label text boxes or bleed off viewport
    const iconOverlaps: LayoutFindings['iconOverlaps'] = [];
    const iconBleeds: LayoutFindings['iconBleeds'] = [];
    for (const icon of Array.from(document.querySelectorAll('.category-emoji-img'))) {
      if (!isVisible(icon)) continue;
      const rIcon = icon.getBoundingClientRect();
      if ((rIcon.right > viewportW + 2 || rIcon.left < -2) && !isInsideHorizScroller(icon)) {
        iconBleeds.push({
          iconClass: icon.className,
          left: Math.round(rIcon.left),
          right: Math.round(rIcon.right),
          viewportW,
        });
      }

      const parent = icon.parentElement;
      if (!parent) continue;
      for (const child of Array.from(parent.childNodes)) {
        if (child === icon) continue;
        let rTarget: DOMRect | null = null;
        let targetDesc = '';
        if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
          const range = document.createRange();
          range.selectNodeContents(child);
          rTarget = range.getBoundingClientRect();
          targetDesc = child.textContent.trim();
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as Element;
          if (!isVisible(el) || el.contains(icon)) continue;
          rTarget = el.getBoundingClientRect();
          targetDesc = describeEl(el);
        }
        if (!rTarget || rTarget.width <= 1 || rTarget.height <= 1) continue;
        const { w, h } = intersect(rIcon, rTarget);
        if (w > 2 && h > 2) {
          iconOverlaps.push({
            iconClass: icon.className,
            target: targetDesc,
            w: Math.round(w),
            h: Math.round(h),
          });
        }
      }
    }

    return {
      docOverflow: { docScrollW, bodyScrollW, clientW: viewportW },
      brokenImages,
      overflowingImages,
      distortedImages,
      headerOverlaps,
      headerOutOfBounds,
      interactiveOverlaps,
      iconOverlaps,
      iconBleeds,
    };
  });

  if (takeScreenshot) {
    const safeName = `${routeLabel}-${viewportName}`.replace(/[^a-z0-9-_]/gi, '_');
    const useFullPage = !['user-catalog', 'admin-products-edit-modal'].includes(routeLabel);
    await page.screenshot({
      path: testInfo.outputPath(`${safeName}.png`),
      fullPage: useFullPage,
      animations: 'disabled',
    });
  }

  expect(pageErrors, `${routeLabel} (${viewportName}) pageerrors`).toEqual([]);
  expect(failedAssets, `${routeLabel} (${viewportName}) failed assets`).toEqual([]);
  expect(
    findings.docOverflow.docScrollW,
    `${routeLabel} (${viewportName}) documentElement scrollWidth`,
  ).toBeLessThanOrEqual(findings.docOverflow.clientW + 1);
  expect(
    findings.docOverflow.bodyScrollW,
    `${routeLabel} (${viewportName}) body scrollWidth`,
  ).toBeLessThanOrEqual(findings.docOverflow.clientW + 1);
  expect(findings.brokenImages, `${routeLabel} (${viewportName}) brokenImages`).toEqual([]);
  expect(findings.overflowingImages, `${routeLabel} (${viewportName}) overflowingImages`).toEqual([]);
  expect(findings.distortedImages, `${routeLabel} (${viewportName}) distortedImages`).toEqual([]);
  expect(findings.headerOutOfBounds, `${routeLabel} (${viewportName}) headerOutOfBounds`).toEqual([]);
  expect(findings.headerOverlaps, `${routeLabel} (${viewportName}) headerOverlaps`).toEqual([]);
  expect(findings.interactiveOverlaps, `${routeLabel} (${viewportName}) interactiveOverlaps`).toEqual([]);
  expect(findings.iconOverlaps, `${routeLabel} (${viewportName}) iconOverlaps`).toEqual([]);
  expect(findings.iconBleeds, `${routeLabel} (${viewportName}) iconBleeds`).toEqual([]);
}

test.describe('Full Storefront & Admin Responsive Visual & Asset Audit', () => {
  const routes: Array<{ label: string; path: string; seedCart?: boolean }> = [
    { label: 'user-catalog', path: '/' },
    { label: 'user-all-products', path: '/productos' },
    { label: 'user-category-regalos-listo', path: '/categorias/regalos-listo-para-entrega' },
    { label: 'user-category-menos-dolar', path: '/categorias/menos-de-un-dolar' },
    { label: 'user-category-regalos', path: '/categorias/bolsas-o-cajas-de-regalo' },
    { label: 'user-product-detail', path: '/products/1' },
    { label: 'user-cart-empty', path: '/cart', seedCart: false },
    { label: 'user-cart-filled', path: '/cart', seedCart: true },
    { label: 'user-checkout', path: '/checkout', seedCart: true },
    { label: 'user-confirmation', path: `/confirmation/${ORDER_TOKEN}` },
    { label: 'user-404', path: '/ruta-inexistente' },
    { label: 'admin-dashboard', path: '/tokki-admin' },
    { label: 'admin-orders', path: '/tokki-admin/orders' },
    { label: 'admin-order-detail', path: '/tokki-admin/orders/21' },
    { label: 'admin-orders-new-pos', path: '/tokki-admin/orders/new' },
    { label: 'admin-products', path: '/tokki-admin/products' },
    { label: 'admin-products-edit-modal', path: '/tokki-admin/products?edit=1' },
    { label: 'admin-devtools', path: '/tokki-admin/dev' },
  ];

  test('audits all routes and assets cleanly', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const viewportName = testInfo.project.name.replace(/^audit-/, '');
    const takeScreenshot =
      process.env.E2E_SCREENSHOTS === '1' && SCREENSHOT_VIEWPORTS.has(viewportName);
    await setupApiAndImageMocks(page);

    const pageErrors: string[] = [];
    const failedAssets: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (res) => {
      if (res.status() >= 400 && !res.url().includes('/favicon')) {
        failedAssets.push(`${res.status()} ${res.url()}`);
      }
    });

    for (const route of routes) {
      pageErrors.length = 0;
      failedAssets.length = 0;

      if (route.seedCart) {
        await seedCart(page);
        await page.goto(route.path);
      } else {
        await page.goto(route.path);
        if (route.label === 'user-cart-empty') {
          await page.evaluate(() => window.localStorage.removeItem('tokki_cart_v1'));
          await page.reload();
        }
      }

      await auditPageLayout(page, route.label, viewportName, takeScreenshot, testInfo, pageErrors, failedAssets);

      if (route.label === 'user-catalog') {
        const sectionTitles = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.category-section .category-title')).map(
            (el) => el.textContent?.trim() ?? '',
          ),
        );
        expect(sectionTitles[0]).toBe('Regalos listo para entrega');
        expect(sectionTitles[1]).toBe('Todos');

        const discountAudit = await page.evaluate(() => {
          const badges = Array.from(document.querySelectorAll('.product-card .card-discount-badge'));
          const badPositions: string[] = [];
          for (const badge of badges) {
            const card = badge.closest('.product-card');
            const wrap = badge.closest('.card-img-wrap');
            const addBtn = card?.querySelector('.card-add-btn');
            if (!wrap || !addBtn) continue;
            const br = badge.getBoundingClientRect();
            const wr = wrap.getBoundingClientRect();
            if (wr.width === 0 || wr.height === 0) continue;
            const ar = addBtn.getBoundingClientRect();
            if (br.left >= wr.left + wr.width / 2 || br.top >= wr.top + wr.height / 2) {
              badPositions.push(`Badge not in top-left: ${badge.textContent}`);
            }
            const ox = Math.max(0, Math.min(br.right, ar.right) - Math.max(br.left, ar.left));
            const oy = Math.max(0, Math.min(br.bottom, ar.bottom) - Math.max(br.top, ar.top));
            if (ox > 0 && oy > 0) {
              badPositions.push(`Badge overlaps quick-add "+": ${badge.textContent}`);
            }
          }
          return {
            badgeCount: badges.length,
            discountedPriceCount: document.querySelectorAll('.product-card .tokki-price__current--discounted').length,
            originalPriceCount: document.querySelectorAll('.product-card .tokki-price__original').length,
            badPositions,
          };
        });
        expect(discountAudit.badgeCount).toBeGreaterThan(0);
        expect(discountAudit.discountedPriceCount).toBeGreaterThan(0);
        expect(discountAudit.originalPriceCount).toBeGreaterThan(0);
        expect(discountAudit.badPositions).toEqual([]);
      }

      if (route.label === 'user-product-detail') {
        await expect(page.locator('.product-price .tokki-price__current--discounted')).toBeVisible();
        await expect(page.locator('.product-price del.tokki-price__original')).toBeVisible();
        await expect(page.locator('.product-price .tokki-price__badge')).toHaveText('-20%');
      }
    }
  });
});
