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
});
