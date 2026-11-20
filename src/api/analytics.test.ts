import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getTopProducts, fetchTopProducts } from './analytics';
import type { TopProductStat } from '../types';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
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

const SAMPLE_STAT: TopProductStat = {
  product_id: 12,
  product_name: 'Bálsamo Labial Fresa',
  category: 'Maquillaje',
  product_price: '5.00',
  qty_available: 2,
  in_stock: true,
  product_image_urls: ['http://localhost:3000/images/products/a.webp'],
  product_image_url: 'http://localhost:3000/images/products/a.webp',
  units_sold: 24,
  orders_count: 14,
  total_revenue: '120.00',
};

describe('getTopProducts', () => {
  test('GETs /api/analytics/top-products with Bearer and normalizes missing data to []', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));

    const result = await getTopProducts(undefined, { getToken: async () => 'clerk-token' });

    expect(fetchMock).toHaveBeenCalledWith('/api/analytics/top-products', expect.any(Object));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/analytics/top-products');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer clerk-token');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });

  test('appends sort, period, and limit query parameters when provided', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: [SAMPLE_STAT],
      }),
    );

    const result = await getTopProducts(
      { sort: 'revenue', period: '30d', limit: 5 },
      { getToken: async () => 'clerk-token' },
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/analytics/top-products?sort=revenue&period=30d&limit=5');
    expect(init.headers.Authorization).toBe('Bearer clerk-token');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([SAMPLE_STAT]);
  });
});

describe('fetchTopProducts', () => {
  test('resolves TopProductStat[] on success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: [SAMPLE_STAT] }));

    const rows = await fetchTopProducts({ sort: 'units', period: '7d', limit: 5 });
    expect(rows).toEqual([SAMPLE_STAT]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/top-products?sort=units&period=7d&limit=5',
      expect.any(Object),
    );
  });

  test('throws Error with backend message on failure', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: 'Authentication required.' }, 401),
    );

    await expect(fetchTopProducts()).rejects.toThrow('Authentication required.');
  });
});
