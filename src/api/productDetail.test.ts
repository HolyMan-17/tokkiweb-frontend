import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { invalidateCatalogCache, setCachedCatalog } from './catalogCache';
import { fetchProductDetail } from './productDetail';
import type { Product } from '../types';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  invalidateCatalogCache();
  delete window.__TOKKI_INITIAL_PRODUCT__;
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('fetchProductDetail', () => {
  test('returns warm cached product with zero network requests', async () => {
    const cachedProduct: Product = {
      product_id: 7,
      product_name: 'Gloss Durazno',
      product_price: '4.50',
      product_description: 'Brillo frutal',
      category: 'Maquillaje',
      qty_available: 6,
      in_stock: true,
    };
    setCachedCatalog([cachedProduct]);

    const result = await fetchProductDetail(7);
    expect(result).toEqual(cachedProduct);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('fetches single product via GET /products/:id on cold cache and normalizes fields', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          product_id: 7,
          product_name: 'Llavero Conejito',
          product_price: 5.5,
          product_description: 'Acrílico rosa',
          category: 'Llaveros',
          qty_available: 3,
          in_stock: true,
          product_image_url: null,
        },
      }),
    );

    const result = await fetchProductDetail(7);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/products/7');
    expect(result).toEqual({
      product_id: 7,
      product_name: 'Llavero Conejito',
      product_price: '5.5',
      discount_percent: 0,
      product_description: 'Acrílico rosa',
      category: 'Llaveros',
      qty_available: 3,
      in_stock: true,
      product_image_url: undefined,
      product_image_urls: undefined,
    });
  });

  test('returns null immediately on 404 without falling back to full catalog', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: 'Product not found' }, 404),
    );

    const result = await fetchProductDetail(999);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/products/999');
  });

  test('falls back to fetchAllProducts when GET /products/:id fails with non-404 (e.g. 502)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'Bad gateway' }, 502))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: [
            {
              product_id: 7,
              product_name: 'Pocky Fresa',
              product_price: '3.25',
              product_description: 'Snack dulce',
              category: 'Dulces & Comida Asiatica',
              qty_available: 12,
              in_stock: true,
            },
          ],
        }),
      );

    const result = await fetchProductDetail(7);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/products/7');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/products');
    expect(result?.product_name).toBe('Pocky Fresa');
  });

  test('returns null with zero requests when productId is invalid (NaN or <= 0)', async () => {
    expect(await fetchProductDetail(Number.NaN)).toBeNull();
    expect(await fetchProductDetail(0)).toBeNull();
    expect(await fetchProductDetail(-3)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('consumes window.__TOKKI_INITIAL_PRODUCT__ once when product_id matches without fetching', async () => {
    window.__TOKKI_INITIAL_PRODUCT__ = {
      product_id: 14,
      product_name: 'Labial Coreano',
      product_price: 6,
      product_description: 'Hidratante',
      category: 'Maquillaje',
      qty_available: 4,
      in_stock: true,
      product_image_url: '/images/products/labial.webp',
    };

    const first = await fetchProductDetail(14);
    expect(first?.product_name).toBe('Labial Coreano');
    expect(first?.product_price).toBe('6');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.__TOKKI_INITIAL_PRODUCT__).toBeUndefined();

    // Subsequent fetch hits the API because the bootstrap payload was consumed once
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          product_id: 14,
          product_name: 'Labial Coreano',
          product_price: '6.00',
          product_description: 'Hidratante',
          category: 'Maquillaje',
          qty_available: 2,
          in_stock: true,
        },
      }),
    );

    const second = await fetchProductDetail(14);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second?.qty_available).toBe(2);
  });

  test('ignores window.__TOKKI_INITIAL_PRODUCT__ when product_id does not match', async () => {
    window.__TOKKI_INITIAL_PRODUCT__ = {
      product_id: 99,
      product_name: 'Otro',
      product_price: '2.00',
      product_description: 'Desc',
      category: 'Otros',
      qty_available: 1,
      in_stock: true,
    };

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          product_id: 15,
          product_name: 'Solicitado',
          product_price: '4.00',
          product_description: 'Desc',
          category: 'Otros',
          qty_available: 3,
          in_stock: true,
        },
      }),
    );

    const result = await fetchProductDetail(15);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result?.product_id).toBe(15);
  });
});
