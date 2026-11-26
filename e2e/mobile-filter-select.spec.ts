import { test, expect, type Page } from '@playwright/test';

// Guarda durable de layout móvil para el selector de orden (.sort-select).
// El popup nativo de opciones en iOS/Android se ancla a las métricas
// renderizadas del control; no es reproducible en Chromium headless, así que
// estas pruebas protegen el layout del control en viewport 375×667: visible,
// completamente dentro del viewport y sin overflow horizontal en las tres
// pantallas que usan .sort-select.

const MOCK_PRODUCTS = [
  {
    product_id: 1,
    product_name: 'Brillo Labial Fresa',
    product_price: '3.50',
    qty_available: 20,
    in_stock: true,
    category: 'Maquillaje',
    product_description: 'Brillo hidratante con aroma a fresa',
    product_image_url: null,
  },
  {
    product_id: 2,
    product_name: 'Sombra de Ojos Pastel',
    product_price: '6.00',
    qty_available: 12,
    in_stock: true,
    category: 'Maquillaje',
    product_description: 'Paleta de sombras en tonos pastel',
    product_image_url: null,
  },
  {
    product_id: 3,
    product_name: 'Peluche Pompompurin',
    product_price: '18.00',
    qty_available: 8,
    in_stock: true,
    category: 'Peluches',
    product_description: 'Peluche suave de Sanrio',
    product_image_url: null,
  },
  {
    product_id: 4,
    product_name: 'Caja de Regalo Corazones Pastel',
    product_price: '4.50',
    qty_available: 30,
    in_stock: true,
    category: 'Bolsas o cajas de regalo',
    product_description: 'Caja rígida cuadrada con lazo de satén',
    product_image_url: null,
  },
  {
    product_id: 5,
    product_name: 'Llavero Acrylic Bunny',
    product_price: '2.50',
    qty_available: 40,
    in_stock: true,
    category: 'Llaveros',
    product_description: 'Llavero acrílico con diseño de conejito',
    product_image_url: null,
  },
];

function setupMocks(page: Page) {
  return page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PRODUCTS }),
    });
  });
}

async function assertSelectFitsViewport(page: Page) {
  const select = page.locator('.sort-select');
  await expect(select).toBeVisible();
  // En pantallas con contenido por encima de la toolbar (admin), el control
  // puede estar bajo el pliegue inicial; al trayarlo al viewport, su caja
  // (viewport-relative) queda medible dentro de la pantalla.
  await select.scrollIntoViewIfNeeded();

  const box = await select.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  }

  const styles = await select.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      appearance: s.appearance,
      backgroundImage: s.backgroundImage,
      borderTopWidth: s.borderTopWidth,
      borderRadius: s.borderRadius,
      fontSize: s.fontSize,
      fontFamily: s.fontFamily,
      minHeight: s.minHeight,
    };
  });
  expect(styles.appearance).toBe('none');
  expect(styles.backgroundImage).toContain('data:image/svg+xml');
  expect(styles.borderTopWidth).toBe('2px');
  expect(styles.borderRadius).toBe('12px');
  expect(parseFloat(styles.fontSize)).toBeGreaterThanOrEqual(16);
  expect(styles.fontFamily).toMatch(/Sour Gummy/i);
  expect(parseFloat(styles.minHeight)).toBeGreaterThanOrEqual(40);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, 'la página no debe tener overflow horizontal').toBeLessThanOrEqual(0);
}

test.describe('Selector de orden en móvil — layout y viewport', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('la página de admin de productos muestra el selector de orden dentro del viewport', async ({ page }) => {
    await page.goto('/tokki-admin/products');
    await assertSelectFitsViewport(page);
  });

  test('la página de categoría muestra el selector de orden dentro del viewport', async ({ page }) => {
    await page.goto('/categorias/maquillaje');
    await assertSelectFitsViewport(page);
  });

  test('la página de productos (/productos) muestra el selector de orden dentro del viewport', async ({ page }) => {
    await page.goto('/productos');
    await assertSelectFitsViewport(page);
  });
});
