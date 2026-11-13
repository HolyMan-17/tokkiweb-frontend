import { test, expect, type Page } from '@playwright/test';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const URL_A = 'http://localhost:3000/images/products/aaaaaaaa-1111-4111-8111-111111111111.webp';
const URL_B = 'http://localhost:3000/images/products/bbbbbbbb-2222-4222-8222-222222222222.webp';
const URL_C = 'http://localhost:3000/images/products/cccccccc-3333-4333-8333-333333333333.webp';

const PRODUCT_WITH_GALLERY = {
  product_id: 1,
  product_name: 'Bálsamo Labial Fresa',
  product_price: '3.50',
  product_description: 'Bálsamo hidratante',
  qty_available: 20,
  in_stock: true,
  category: 'Maquillaje',
  product_image_url: URL_A,
  product_image_urls: [URL_A, URL_B, URL_C],
};

const PRODUCT_SINGLE = {
  ...PRODUCT_WITH_GALLERY,
  product_id: 2,
  product_name: 'Mochi Fresa Cream',
  product_image_url: URL_B,
  product_image_urls: [URL_B],
};

const PRODUCT_LEGACY = {
  ...PRODUCT_WITH_GALLERY,
  product_id: 3,
  product_name: 'Photocard de Junko',
  product_image_url: URL_C,
  product_image_urls: undefined, // sin galería: fallback a la imagen heredada
};

// ─── Mock helpers ─────────────────────────────────────────────────────────────

async function mockProducts(page: Page, products: typeof PRODUCT_WITH_GALLERY[]) {
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: products }),
    });
  });
  await page.route('**/api/products/*', async (route) => {
    const url = new URL(route.request().url());
    const id = Number(url.pathname.split('/').pop());
    const product = products.find((p) => p.product_id === id) ?? products[0];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: product }),
    });
  });
}

async function expectGalleryReady(page: Page) {
  const track = page.locator('.product-gallery-track');
  await expect(track).toBeVisible();
  await expect(track.locator('.product-gallery-slide')).toHaveCount(3);
  // Espera a que el layout estabilice (scroll-snap + slides de 100% de ancho).
  await track.evaluate((el) => el.scrollLeft);
}

// ─── Surfaces ─────────────────────────────────────────────────────────────────

test.describe('Galería de producto — carrusel con portada y miniaturas', () => {
  test('producto con varias imágenes muestra carrusel, miniaturas y portada activa', async ({ page }) => {
    await mockProducts(page, [PRODUCT_WITH_GALLERY]);
    await page.goto('/products/1');

    await expectGalleryReady(page);

    // Las 3 diapositivas referencian las URLs del contrato en orden (1ª = portada).
    const slideSrcs = await page.locator('.product-gallery-img').evaluateAll((imgs) =>
      imgs.map((img) => img.getAttribute('src')),
    );
    expect(slideSrcs).toEqual([URL_A, URL_B, URL_C]);

    // La primera miniatura es la activa (aria-current) y solo hay una activa.
    await expect(page.locator('.product-gallery-thumb[aria-current="true"]')).toHaveCount(1);
    await expect(page.locator('.product-gallery-thumb').first()).toHaveAttribute('aria-current', 'true');
  });

  test('clic en una miniatura desplaza el carrusel y marca esa miniatura como activa', async ({ page }) => {
    await mockProducts(page, [PRODUCT_WITH_GALLERY]);
    await page.goto('/products/1');

    await expectGalleryReady(page);

    await page.locator('.product-gallery-thumb').nth(2).click();

    // El track termina alineado con la 3ª diapositiva (scroll-snap / smooth).
    await expect
      .poll(async () =>
        page.locator('.product-gallery-track').evaluate((el) => Math.round(el.scrollLeft)),
      )
      .toBeGreaterThan(0);

    await expect(page.locator('.product-gallery-thumb').nth(2)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.product-gallery-thumb').first()).not.toHaveAttribute('aria-current');
  });

  test('deslizar el carrusel actualiza la miniatura activa', async ({ page }) => {
    await mockProducts(page, [PRODUCT_WITH_GALLERY]);
    await page.goto('/products/1');

    await expectGalleryReady(page);

    // Simula un swipe: el usuario arrastra el track hasta la 2ª diapositiva.
    await page.locator('.product-gallery-track').evaluate((el) => {
      const slide = el.children[1] as HTMLElement;
      el.scrollTo({ left: slide.offsetLeft, behavior: 'auto' });
    });

    await expect(page.locator('.product-gallery-thumb').nth(1)).toHaveAttribute('aria-current', 'true');
  });

  test('producto con una sola imagen no muestra miniaturas', async ({ page }) => {
    await mockProducts(page, [PRODUCT_SINGLE]);
    await page.goto('/products/2');

    await expect(page.locator('.product-gallery-img')).toHaveCount(0);
    await expect(page.locator('.product-gallery')).toHaveCount(0);

    const single = page.locator('.product-image-container img').first();
    await expect(single).toHaveAttribute('src', URL_B);
  });

  test('producto heredado (solo product_image_url) sigue mostrando su imagen', async ({ page }) => {
    await mockProducts(page, [PRODUCT_LEGACY]);
    await page.goto('/products/3');

    await expect(page.locator('.product-gallery')).toHaveCount(0);
    const single = page.locator('.product-image-container img').first();
    await expect(single).toHaveAttribute('src', URL_C);
  });
});
