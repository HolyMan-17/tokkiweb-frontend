import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { type NodeReq, type NodeRes } from './og-product';

describe('api/og-product handler', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('devuelve HTML con Open Graph cuando el producto existe en el backend (Node req/res)', async () => {
    const mockProduct = {
      product_id: 30,
      product_name: 'POPSOCKET JUNGKOOK',
      product_price: '4.80',
      product_description: 'POPSOCKET acrílico',
      category: 'Zona KPOP',
      qty_available: 5,
      in_stock: true,
      product_image_url: 'https://api.tokkishopve.com/images/products/jungkook.webp',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockProduct }),
    }) as unknown as typeof fetch;

    const req: NodeReq = {
      query: { id: '30' },
      url: '/api/og-product?id=30',
      headers: {},
    };

    let statusCode = 200;
    const headers: Record<string, string> = {};
    let responseBody = '';

    const res: NodeRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers[name] = value;
        return this;
      },
      send(body: string) {
        responseBody = body;
        return this;
      },
      end(body?: string) {
        if (body) responseBody = body;
        return this;
      },
    };

    await handler(req, res);

    expect(statusCode).toBe(200);
    expect(headers['Content-Type']).toContain('text/html');
    expect(headers['Cache-Control']).toContain('s-maxage=3600');
    expect(responseBody).toContain('POPSOCKET JUNGKOOK — $4.80 | Tokki Shop');
    expect(responseBody).toContain('https://api.tokkishopve.com/images/products/jungkook.webp');
  });

  it('devuelve HTML con Open Graph usando Request web standard (Edge/Fetch mode)', async () => {
    const mockProduct = {
      product_id: 30,
      product_name: 'POPSOCKET JUNGKOOK',
      product_price: '4.80',
      product_description: 'POPSOCKET acrílico',
      category: 'Zona KPOP',
      qty_available: 5,
      in_stock: true,
      product_image_url: 'https://api.tokkishopve.com/images/products/jungkook.webp',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockProduct }),
    }) as unknown as typeof fetch;

    const request = new Request('https://www.tokkishopve.com/api/og-product?id=30');
    const response = (await handler(request)) as Response;

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    const html = await response.text();
    expect(html).toContain('POPSOCKET JUNGKOOK — $4.80 | Tokki Shop');
  });

  it('devuelve fallback cuando el producto no se encuentra (404 backend)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, message: 'Product was not found.' }),
    }) as unknown as typeof fetch;

    const request = new Request('https://www.tokkishopve.com/api/og-product?id=99999');
    const response = (await handler(request)) as Response;

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Tokki Shop — Accesorios y Dulces Coreanos');
  });

  it('devuelve fallback cuando el parámetro id es inválido o no numérico', async () => {
    const request = new Request('https://www.tokkishopve.com/api/og-product?id=abc');
    const response = (await handler(request)) as Response;

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Tokki Shop — Accesorios y Dulces Coreanos');
  });
});
