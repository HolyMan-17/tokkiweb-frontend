import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CRAWLER_RE,
  PRODUCT_RE,
  SECURITY_HEADERS,
  MIME_TYPES,
  escapeHtml,
  ogFormatPrice,
  resolveImageUrl,
  buildProductOgHtml,
  buildFallbackOgHtml,
  serveStaticFile,
  handleRequest,
} from '../../server/og-server.mjs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

describe('server/og-server.mjs — Crawler & Route Matchers', () => {
  it('detecta correctamente User-Agents de crawlers y redes sociales (WhatsApp, Facebook, Twitter, etc.)', () => {
    const crawlers = [
      'WhatsApp/2.21.12.21 i',
      'WhatsApp/0.3.4479 N',
      'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)',
      'Facebot',
      'Twitterbot/1.0',
      'TelegramBot (like TwitterBot)',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
      'Pinterest/0.2 (+http://www.pinterest.com/bot.html)',
      'google-pagerenderer',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    ];

    for (const ua of crawlers) {
      expect(CRAWLER_RE.test(ua)).toBe(true);
    }
  });

  it('no confunde navegadores estándar de usuarios con crawlers', () => {
    const browsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    ];

    for (const ua of browsers) {
      expect(CRAWLER_RE.test(ua)).toBe(false);
    }
  });

  it('valida rutas canónicas de productos /products/:id', () => {
    expect(PRODUCT_RE.test('/products/1')).toBe(true);
    expect(PRODUCT_RE.test('/products/30')).toBe(true);
    expect(PRODUCT_RE.test('/products/99999')).toBe(true);

    expect(PRODUCT_RE.test('/products')).toBe(false);
    expect(PRODUCT_RE.test('/products/')).toBe(false);
    expect(PRODUCT_RE.test('/products/abc')).toBe(false);
    expect(PRODUCT_RE.test('/products/1/edit')).toBe(false);
    expect(PRODUCT_RE.test('/categorias/maquillaje')).toBe(false);
  });
});

describe('server/og-server.mjs — Helpers de Formato & Escapado', () => {
  it('escapa caracteres especiales en HTML', () => {
    expect(escapeHtml('Tinta & Brillo <script>alert("xss")</script> \'Kawaii\'')).toBe(
      'Tinta &amp; Brillo &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &#39;Kawaii&#39;',
    );
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null as unknown as string)).toBe('');
  });

  it('formatea precios monetarios correctamente', () => {
    expect(ogFormatPrice(4.8)).toBe('$4.80');
    expect(ogFormatPrice('4.80')).toBe('$4.80');
    expect(ogFormatPrice('0')).toBe('$0.00');
    expect(ogFormatPrice('invalido')).toBe('$0.00');
  });

  it('resuelve URLs de imágenes relativas y absolutas', () => {
    const siteUrl = 'https://www.tokkishopve.com';
    expect(resolveImageUrl('/images/products/tint.webp', siteUrl)).toBe(
      'https://www.tokkishopve.com/images/products/tint.webp',
    );
    expect(resolveImageUrl('https://cdn.example.com/item.png', siteUrl)).toBe(
      'https://cdn.example.com/item.png',
    );
    expect(resolveImageUrl(undefined, siteUrl)).toBe(
      'https://www.tokkishopve.com/tokki_logo.png',
    );
    expect(resolveImageUrl('', siteUrl)).toBe(
      'https://www.tokkishopve.com/tokki_logo.png',
    );
  });
});

describe('server/og-server.mjs — Generación HTML de Open Graph', () => {
  const mockProduct = {
    product_id: 42,
    product_name: 'Gloss Conejito Rosa',
    product_price: '5.50',
    product_description: 'Brillo labial hidratante con empaque kawaii',
    in_stock: true,
    qty_available: 10,
    product_image_url: '/images/products/gloss.webp',
  };

  it('genera etiquetas Open Graph completas para un producto en stock', () => {
    const html = buildProductOgHtml(mockProduct, {
      siteUrl: 'https://www.tokkishopve.com',
    });

    expect(html).toContain('<title>Gloss Conejito Rosa — $5.50 | Tokki Shop</title>');
    expect(html).toContain('<meta property="og:type" content="product" />');
    expect(html).toContain('<meta property="og:title" content="Gloss Conejito Rosa — $5.50 | Tokki Shop" />');
    expect(html).toContain('<meta property="og:url" content="https://www.tokkishopve.com/products/42" />');
    expect(html).toContain('<meta property="og:image" content="https://www.tokkishopve.com/images/products/gloss.webp" />');
    expect(html).toContain('<meta property="product:price:amount" content="5.50" />');
    expect(html).toContain('<meta property="product:price:currency" content="USD" />');
    expect(html).toContain('<meta property="product:availability" content="in stock" />');
    expect(html).toContain('window.location.replace("https://www.tokkishopve.com/products/42")');
  });

  it('marca producto como "out of stock" cuando qty_available es 0 o in_stock es false', () => {
    const outOfStockProduct = {
      ...mockProduct,
      in_stock: false,
      qty_available: 0,
    };
    const html = buildProductOgHtml(outOfStockProduct);
    expect(html).toContain('<meta property="product:availability" content="out of stock" />');
  });

  it('genera HTML de fallback cuando el producto no se encuentra', () => {
    const html = buildFallbackOgHtml('https://www.tokkishopve.com/products/999');
    expect(html).toContain('<title>Tokki Shop — Accesorios y Dulces Coreanos</title>');
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:image" content="https://www.tokkishopve.com/tokki_logo.png" />');
    expect(html).toContain('window.location.replace("https://www.tokkishopve.com/products/999")');
  });
});

describe('server/og-server.mjs — Request Handler & Endpoints', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createMockRes() {
    const headers: Record<string, string> = {};
    let statusCode = 200;
    let body = '';

    const res = {
      statusCode: 200,
      headersSent: false,
      setHeader(name: string, value: string) {
        headers[name] = value;
      },
      writeHead(code: number, hdrs?: Record<string, string>) {
        statusCode = code;
        res.statusCode = code;
        res.headersSent = true;
        if (hdrs) Object.assign(headers, hdrs);
      },
      end(chunk?: string | Buffer) {
        if (chunk) body += chunk.toString();
        res.headersSent = true;
      },
      _getBody() {
        return body;
      },
      _getHeaders() {
        return headers;
      },
      _getStatusCode() {
        return statusCode;
      },
    } as unknown as ServerResponse & {
      _getBody: () => string;
      _getHeaders: () => Record<string, string>;
      _getStatusCode: () => number;
    };

    return res;
  }

  function createMockReq(options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
  }) {
    const emitter = new EventEmitter();
    const req = Object.assign(emitter, {
      url: options.url,
      method: options.method || 'GET',
      headers: options.headers || {},
      pipe(dest: unknown) {
        return dest;
      },
    }) as unknown as IncomingMessage;
    return req;
  }

  it('responde 200 al endpoint de salud /health con status ok para Coolify', async () => {
    const req = createMockReq({ url: '/health' });
    const res = createMockRes();

    await handleRequest(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['Content-Type']).toBe('application/json');
    const parsed = JSON.parse(res._getBody());
    expect(parsed.status).toBe('ok');
  });

  it('responde 200 al endpoint de salud alternativo /healthz', async () => {
    const req = createMockReq({ url: '/healthz' });
    const res = createMockRes();

    await handleRequest(req, res);

    expect(res._getStatusCode()).toBe(200);
    const parsed = JSON.parse(res._getBody());
    expect(parsed.status).toBe('ok');
  });

  it('intercepta a un crawler de WhatsApp en /products/:id y sirve HTML con Open Graph', async () => {
    const mockProductData = {
      product_id: 30,
      product_name: 'POPSOCKET JUNGKOOK',
      product_price: '4.80',
      product_description: 'Popsocket acrílico BTS',
      in_stock: true,
      qty_available: 5,
      product_image_url: 'https://api.tokkishopve.com/images/products/jungkook.webp',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockProductData }),
    }) as unknown as typeof fetch;

    const req = createMockReq({
      url: '/products/30',
      headers: {
        'user-agent': 'WhatsApp/2.21.12.21 i',
      },
    });
    const res = createMockRes();

    await handleRequest(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['Content-Type']).toContain('text/html');
    expect(res._getHeaders()['Cache-Control']).toContain('s-maxage=3600');
    expect(res._getHeaders()['X-Content-Type-Options']).toBe('nosniff');
    expect(res._getHeaders()['X-Frame-Options']).toBe('DENY');

    const html = res._getBody();
    expect(html).toContain('POPSOCKET JUNGKOOK — $4.80 | Tokki Shop');
    expect(html).toContain('https://api.tokkishopve.com/images/products/jungkook.webp');
  });

  it('sirve fallback si el backend responde con error 404 al crawler', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, message: 'Not found' }),
    }) as unknown as typeof fetch;

    const req = createMockReq({
      url: '/products/9999',
      headers: {
        'user-agent': 'facebookexternalhit/1.1',
      },
    });
    const res = createMockRes();

    await handleRequest(req, res);

    expect(res._getStatusCode()).toBe(200);
    const html = res._getBody();
    expect(html).toContain('Tokki Shop — Accesorios y Dulces Coreanos');
    expect(html).toContain('https://www.tokkishopve.com/tokki_logo.png');
  });

  it('permite acceso directo compatible a /api/og-product?id=30', async () => {
    const mockProductData = {
      product_id: 30,
      product_name: 'POPSOCKET JUNGKOOK',
      product_price: '4.80',
      product_description: 'Popsocket',
      in_stock: true,
      qty_available: 5,
      product_image_url: 'https://api.tokkishopve.com/images/products/jungkook.webp',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockProductData }),
    }) as unknown as typeof fetch;

    const req = createMockReq({
      url: '/api/og-product?id=30',
    });
    const res = createMockRes();

    await handleRequest(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getBody()).toContain('POPSOCKET JUNGKOOK');
  });

  it('sirve la SPA (index.html) para navegadores estándar de usuarios que visitan /products/:id', async () => {
    const req = createMockReq({
      url: '/products/30',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const res = createMockRes();

    await handleRequest(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['Content-Type']).toContain('text/html');
    // Debe servir el index.html (SPA)
    expect(res._getBody()).toContain('<div id="root"></div>');
  });

  it('bloquea intentos de path traversal y sirve fallback seguro sin filtrar archivos internos', async () => {
    const req = createMockReq({
      url: '/../package.json',
      headers: {},
    });
    const res = createMockRes();

    await handleRequest(req, res);

    // No debe devolver el contenido de package.json
    expect(res._getBody()).not.toContain('"name": "tokki-web"');
    // Debe caer en el fallback seguro de la SPA
    expect(res._getStatusCode()).toBe(200);
  });

  it('sirve un archivo estático existente con su tipo MIME correspondiente', async () => {
    const res = createMockRes();
    const served = await serveStaticFile('/index.html', res);
    expect(served).toBe(true);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['Content-Type']).toContain('text/html');
    expect(res._getHeaders()['Cache-Control']).toBe('public, max-age=3600');
  });

  it('retorna false para archivos que no existen en dist', async () => {
    const res = createMockRes();
    const served = await serveStaticFile('/no-existe-archivo.txt', res);
    expect(served).toBe(false);
  });

  it('aplica todas las cabeceras de seguridad requeridas en las respuestas', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(SECURITY_HEADERS['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('provee los tipos MIME esperados para recursos estáticos', () => {
    expect(MIME_TYPES['.html']).toBe('text/html; charset=utf-8');
    expect(MIME_TYPES['.js']).toBe('application/javascript; charset=utf-8');
    expect(MIME_TYPES['.woff2']).toBe('font/woff2');
    expect(MIME_TYPES['.webp']).toBe('image/webp');
    expect(MIME_TYPES['.avif']).toBe('image/avif');
  });
});
