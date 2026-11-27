import { test, expect, type Page } from '@playwright/test';
import { CATEGORIES } from '../src/constants';
import { VIEWPORTS } from './viewports';

const ACTIVE_CATEGORIES = [
  'Menos de un dolar',
  'Zona KPOP',
  'Maquillaje',
  'Skincare',
  'Pines & Chapas',
  'Papeleria',
  'Bolsas o cajas de regalo',
  'Regalos de pareja',
] as const;

const UNUSED_CATEGORIES = ['Cosplays', 'Figuras', 'Peluches'] as const;

function buildMockProducts(categories: readonly string[]) {
  return categories.map((category, index) => ({
    product_id: index + 100,
    product_name: `Producto ${category}`,
    product_price: `${(index + 1) * 2}.00`,
    qty_available: 10,
    in_stock: true,
    category,
    product_description: `Producto de prueba en ${category}`,
    product_image_url: null,
  }));
}

const MOCK_PRODUCTS = buildMockProducts(ACTIVE_CATEGORIES);

function mockCatalogApi(page: Page, products = MOCK_PRODUCTS) {
  return page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: products }),
    });
  });
}

const MOBILE_375 = VIEWPORTS.find((v) => v.name === 'mobile-375')!;
const DESKTOP_1680 = VIEWPORTS.find((v) => v.name === 'desktop-1680')!;

test.describe('CatalogPage Category Quick-Jump Bar', () => {
  test(`shows only active categories, fits cleanly, and scrolls to target section on ${MOBILE_375.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: MOBILE_375.width, height: MOBILE_375.height });
    await mockCatalogApi(page);
    await page.goto('/');

    const jumpNav = page.getByRole('navigation', { name: 'Ir a una categoría' });
    await expect(jumpNav).toBeVisible();

    const pills = jumpNav.locator('button.category-jump-pill');
    await expect(pills).toHaveCount(ACTIVE_CATEGORIES.length);

    const pillLabels = await pills.evaluateAll((els) =>
      els.map((el) => el.textContent?.trim() ?? ''),
    );
    expect(pillLabels).toEqual([...ACTIVE_CATEGORIES]);

    for (const unused of UNUSED_CATEGORIES) {
      await expect(jumpNav.getByRole('button', { name: unused })).toHaveCount(0);
    }

    // Every pill stays compact and its icon is normalized (not oversized by CatalogPage rules)
    const pillMetrics = await pills.evaluateAll((els) =>
      els.map((el) => {
        const pillRect = el.getBoundingClientRect();
        const img = el.querySelector('.category-emoji-img');
        const imgRect = img?.getBoundingClientRect();
        return {
          height: pillRect.height,
          imgWidth: imgRect?.width ?? 0,
          imgHeight: imgRect?.height ?? 0,
        };
      }),
    );
    for (const metric of pillMetrics) {
      expect(metric.height).toBeLessThanOrEqual(44);
      expect(metric.imgWidth).toBeLessThanOrEqual(30);
      expect(metric.imgHeight).toBeLessThanOrEqual(30);
    }

    // No page-wide horizontal overflow
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);

    // Click Papeleria pill and assert smooth scroll lands below the sticky top nav
    const papeleriaPill = jumpNav.getByRole('button', { name: 'Papeleria' });
    await papeleriaPill.click();
    await page.mouse.move(0, 0);

    await expect(papeleriaPill).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    await expect(async () => {
      const position = await page.evaluate(() => {
        const nav = document.querySelector('nav.top-nav');
        const section = document.getElementById('category-section-papeleria');
        if (!nav || !section) return null;
        return {
          navBottom: nav.getBoundingClientRect().bottom,
          sectionTop: section.getBoundingClientRect().top,
          viewportHeight: window.innerHeight,
        };
      });
      expect(position).not.toBeNull();
      expect(position!.sectionTop).toBeGreaterThanOrEqual(position!.navBottom - 4);
      expect(position!.sectionTop).toBeLessThan(position!.viewportHeight * 0.6);
    }).toPass({ timeout: 5000 });
  });

  test(`spans full width without clipping or overlapping pills when overflowing on ${DESKTOP_1680.name}`, async ({
    page,
  }) => {
    const allCategories = CATEGORIES.map((c) => c.name);
    await page.setViewportSize({ width: DESKTOP_1680.width, height: DESKTOP_1680.height });
    await mockCatalogApi(page, buildMockProducts(allCategories));
    await page.goto('/');

    const jumpNav = page.getByRole('navigation', { name: 'Ir a una categoría' });
    await expect(jumpNav).toBeVisible();
    await expect(jumpNav).toHaveClass(/category-jump-nav--scrollable/);

    const layoutSizes = await page.evaluate(() => ({
      navWidth: document.querySelector('.category-jump-nav')!.getBoundingClientRect().width,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layoutSizes.navWidth).toBeGreaterThanOrEqual(layoutSizes.clientWidth - 2);
    expect(layoutSizes.scrollWidth).toBeLessThanOrEqual(layoutSizes.innerWidth);
    expect(layoutSizes.navWidth).toBeGreaterThan(1250);

    const leftArrow = page.getByRole('button', { name: 'Desplazar categorías a la izquierda' });
    const rightArrow = page.getByRole('button', { name: 'Desplazar categorías a la derecha' });
    const track = jumpNav.locator('.category-jump-track');

    await expect(leftArrow).toBeVisible();
    await expect(rightArrow).toBeVisible();
    await expect(leftArrow).toBeDisabled();
    await expect(rightArrow).toBeEnabled();
    await expect(track).toHaveClass(/category-jump-track--fade-right/);

    const geometry = await page.evaluate(() => {
      const left = document.querySelector('.category-jump-arrow--left')!.getBoundingClientRect();
      const right = document.querySelector('.category-jump-arrow--right')!.getBoundingClientRect();
      const t = document.querySelector('.category-jump-track')!.getBoundingClientRect();
      return { leftRight: left.right, trackLeft: t.left, trackRight: t.right, rightLeft: right.left };
    });
    expect(geometry.leftRight).toBeLessThanOrEqual(geometry.trackLeft + 1);
    expect(geometry.trackRight).toBeLessThanOrEqual(geometry.rightLeft + 1);

    await rightArrow.click();

    await expect
      .poll(() => track.evaluate((el) => el.scrollLeft), { timeout: 5000 })
      .toBeGreaterThan(0);
    await expect(leftArrow).toBeEnabled();
    await expect(track).toHaveClass(/category-jump-track--fade-(both|left)/);

    await track.evaluate((el) => {
      el.scrollTo({ left: el.scrollWidth - el.clientWidth, behavior: 'instant' });
    });

    await expect(rightArrow).toBeDisabled();
    await expect(leftArrow).toBeEnabled();
    await expect(track).toHaveClass(/category-jump-track--fade-left/);
    await expect(track).not.toHaveClass(/category-jump-track--fade-right/);
  });

  test(`centers pills with no arrows or edge fade when all pills fit on ${DESKTOP_1680.name}`, async ({
    page,
  }) => {
    const fewCategories = ['Maquillaje', 'Skincare', 'Papeleria'] as const;
    await page.setViewportSize({ width: DESKTOP_1680.width, height: DESKTOP_1680.height });
    await mockCatalogApi(page, buildMockProducts(fewCategories));
    await page.goto('/');

    const jumpNav = page.getByRole('navigation', { name: 'Ir a una categoría' });
    await expect(jumpNav).toBeVisible();
    await expect(jumpNav).not.toHaveClass(/category-jump-nav--scrollable/);
    await expect(jumpNav.locator('.category-jump-arrow')).toHaveCount(0);

    const track = jumpNav.locator('.category-jump-track');
    await expect(track).not.toHaveClass(/category-jump-track--fade-/);

    const margins = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.category-jump-pill'));
      const first = pills[0].getBoundingClientRect();
      const last = pills[pills.length - 1].getBoundingClientRect();
      return {
        leftGap: first.left,
        rightGap: document.documentElement.clientWidth - last.right,
      };
    });
    expect(Math.abs(margins.leftGap - margins.rightGap)).toBeLessThanOrEqual(4);
  });
});
