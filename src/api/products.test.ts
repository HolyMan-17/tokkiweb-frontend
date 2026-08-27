import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  listProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  uploadProductImage,
  removeProductImage,
} from './products';

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

describe('listProducts', () => {
  test('GETs /products and maps rows to the frontend Product shape', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: [
          {
            product_id: 1,
            product_name: 'Pin Ranita',
            product_price: '2.50',
            product_description: 'Pin metálico',
            category: 'Pines & Chapas',
            qty_available: 10,
            in_stock: true,
            product_image: null,
            product_image_url: null,
          },
          {
            product_id: 2,
            product_name: 'Tote',
            product_price: '8.00',
            product_description: 'Bolsa',
            category: 'Otros',
            qty_available: 0,
            in_stock: false,
            product_image: 'products/abc.webp',
            product_image_url: 'http://localhost:3000/images/products/abc.webp',
          },
        ],
      }),
    );

    const result = await listProducts();
    expect(fetchMock).toHaveBeenCalledWith('/api/products', expect.any(Object));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[1].product_image_url).toBe('http://localhost:3000/images/products/abc.webp');
  });

  test('empty-catalog quirk resolves ok with empty array', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: 'true', message: "There's no registered products." }),
    );
    const result = await listProducts();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });
});

describe('createProduct / updateProduct / archiveProduct', () => {
  test('create POSTs JSON payload with numeric price and qty', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        row: { product_id: 9, product_name: 'X', product_price: '1.00', product_description: '', category: 'Otros', qty_available: 1, in_stock: true },
      }),
    );

    await createProduct(
      { product_name: 'X', product_price: 1, product_description: '', category: 'Otros', qty_available: 1 },
      { getToken: async () => 'clerk-token' },
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/products');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer clerk-token');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toMatchObject({ product_price: 1, qty_available: 1 });
  });

  test('update PATCHes only provided fields', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, updated_row: {} }));
    await updateProduct(7, { product_name: 'Nuevo nombre' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/products/7');
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ product_name: 'Nuevo nombre' });
  });

  test('archive DELETEs the product resource', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    await archiveProduct(3, { getToken: async () => 't' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/products/3');
    expect(init.method).toBe('DELETE');
  });
});

describe('image endpoints (multipart, exact backend contract)', () => {
  test('upload posts FormData with "image" field, no manual content-type, bearer when present', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { product_image_url: 'http://x/images/products/a.webp' } }),
    );
    const file = new File(['bytes'], 'foto.png', { type: 'image/png' });

    const result = await uploadProductImage(5, file, { getToken: async () => 'clerk-token' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/products/5/image');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('image')).toBe(file);
    // Browser must set multipart boundary itself
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer clerk-token');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data?.product_image_url).toContain('/images/products/');
  });

  test('remove DELETEs the image endpoint (idempotent)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    await removeProductImage(5, { getToken: async () => 'tok' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/products/5/image');
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  test('surfaces backend rejection (e.g. >5MB) as ok:false with its message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: 'Image exceeds the 5 MB size limit.' }, 400),
    );
    const file = new File(['x'], 'big.png', { type: 'image/png' });
    const result = await uploadProductImage(5, file, { getToken: async () => 'tok' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe('Image exceeds the 5 MB size limit.');
  });
});
