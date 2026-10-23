import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { type NodeReq, type NodeRes } from '../../api/og-product';

describe('api/og-product handler', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('devuelve HTML con Open Graph cuando el producto existe en el backend (Node.js runtime)', async () => {
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

    const headers: Record<string, string> = {};
    let responseBody = '';

    const res: NodeRes = {
      statusCode: 0,
      setHeader(name: string, value: string) {
        headers[name] = value;
      },
      end(body?: string) {
        if (body) responseBody = body;
      },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(200);
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

  it('devuelve metadatos de categoría con rel="canonical" y og:url limpios cuando se solicita una categoría', async () => {
    const request = new Request(
      'https://www.tokkishopve.com/api/og-product?category=albumes&sort=asc&page=2',
    );
    const response = (await handler(request)) as Response;

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>Albumes — Tokki Shop</title>');
    expect(html).toContain(
      '<link rel="canonical" href="https://www.tokkishopve.com/categorias/albumes" />',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://www.tokkishopve.com/categorias/albumes" />',
    );
  });

  it('asegura que rel="canonical" y og:url siempre coinciden en respuestas de productos', async () => {
    const mockProduct = {
      product_id: 205,
      product_name: 'TINTA LABIAL TULIP',
      product_price: '5.50',
      product_description: 'Tinta labial coreana',
      category: 'Maquillaje',
      qty_available: 3,
      in_stock: true,
      product_image_url: 'https://api.tokkishopve.com/images/products/tulip.webp',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockProduct }),
    }) as unknown as typeof fetch;

    const request = new Request('https://www.tokkishopve.com/api/og-product?id=205&ref=fb&v=2');
    const response = (await handler(request)) as Response;

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(
      '<link rel="canonical" href="https://www.tokkishopve.com/products/205" />',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://www.tokkishopve.com/products/205" />',
    );
  });

  it('devuelve fallback cuando el parámetro id es inválido o no numérico', async () => {
    const request = new Request('https://www.tokkishopve.com/api/og-product?id=abc');
    const response = (await handler(request)) as Response;

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Tokki Shop — Accesorios y Dulces Coreanos');
  });
});
