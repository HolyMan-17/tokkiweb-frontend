/**
 * og-server.mjs — Production server for Coolify / Docker deployment.
 *
 * Replaces Vercel's:
 *  - Static SPA hosting (dist/)
 *  - Serverless OG function (api/og-product.ts)
 *  - Reverse-proxy rewrites (/api/*, /images/*)
 *  - Crawler UA detection for social-embed previews (WhatsApp, Discord, etc.)
 *  - Security headers (vercel.json -> headers[])
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// ─── Default Paths & Config ──────────────────────
let __dirname = process.cwd();
try {
  if (typeof import.meta?.url === 'string' && import.meta.url.startsWith('file:')) {
    __dirname = fileURLToPath(new URL('.', import.meta.url));
  }
} catch {
  // Fallback to process.cwd()
}
// In production, og-server.mjs is in /app/server/og-server.mjs, so dist is ../dist.
// If __dirname is server directory, dist is in ../dist. Otherwise it is in ./dist.
const isServerSubdir = /[\\/]server[\\/]?$/.test(__dirname);
const DEFAULT_DIST_DIR = isServerSubdir
  ? normalize(join(__dirname, '..', 'dist'))
  : normalize(join(__dirname, 'dist'));

const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);
const DEFAULT_BACKEND_URL = (
  process.env.BACKEND_URL || 'https://api.tokkishopve.com'
).replace(/\/+$/, '');
const DEFAULT_SITE_URL = (
  process.env.VITE_PUBLIC_SITE_URL || 'https://www.tokkishopve.com'
).replace(/\/+$/, '');

// ─── Crawler Detection (same regex as vercel.json) ─
export const CRAWLER_RE =
  /facebookexternalhit|facebot|twitterbot|telegrambot|whatsapp|discordbot|slackbot|linkedinbot|pinterest|google-pagerenderer|bingbot/i;
export const PRODUCT_RE = /^\/products\/(\d+)$/;

// ─── MIME Types ─────────────────────────────────
export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

// ─── Security Headers (match vercel.json) ───────
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ─── OG Metadata Constants ──────────────────────
const DEFAULT_SITE_NAME = 'Tokki Shop';
const DEFAULT_TITLE = 'Tokki Shop — Accesorios y Dulces Coreanos';
const DEFAULT_DESCRIPTION =
  'Tienda asiatica de maquillaje, skincare, accesorios, lentes de contacto, pines, ropa, peluches, dulces y comida asiática. Envíos a toda Venezuela. 🐰';
const THEME_COLOR = '#e68bbe';

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function ogFormatPrice(price) {
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

export function resolveImageUrl(rawUrl, siteUrl = DEFAULT_SITE_URL) {
  const base = siteUrl.replace(/\/+$/, '');
  if (!rawUrl || rawUrl.trim() === '') return `${base}/tokki_logo.png`;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${base}${cleanPath}`;
}

export function buildProductOgHtml(product, options = {}) {
  const siteUrl = (options.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const productUrl = `${siteUrl}/products/${product.product_id}`;
  const priceFormatted = ogFormatPrice(product.product_price);
  const title = `${product.product_name} — ${priceFormatted} | ${DEFAULT_SITE_NAME}`;

  const rawDesc = product.product_description?.trim()
    ? `${product.product_description.trim()} • Envíos a toda Venezuela 🐰`
    : `Disponible en Tokki Shop — ${DEFAULT_DESCRIPTION}`;

  const description = escapeHtml(rawDesc);
  const escapedTitle = escapeHtml(title);
  const imageUrl = resolveImageUrl(product.product_image_url, siteUrl);
  const escapedImageUrl = escapeHtml(imageUrl);
  const escapedProductUrl = escapeHtml(productUrl);
  const escapedProductName = escapeHtml(product.product_name);
  const isAvailable =
    product.in_stock &&
    (product.qty_available === undefined || product.qty_available > 0);
  const availability = isAvailable ? 'in stock' : 'out of stock';
  const numericPrice = escapeHtml(String(product.product_price));

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${description}" />
  <meta name="theme-color" content="${THEME_COLOR}" />
  <link rel="canonical" href="${escapedProductUrl}" />

  <!-- Open Graph / WhatsApp / Facebook / Discord -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="${DEFAULT_SITE_NAME}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${escapedProductUrl}" />
  <meta property="og:image" content="${escapedImageUrl}" />
  <meta property="og:image:secure_url" content="${escapedImageUrl}" />
  <meta property="og:image:alt" content="${escapedProductName}" />
  <meta property="og:locale" content="es_VE" />

  <!-- Open Graph Product Meta -->
  <meta property="product:price:amount" content="${numericPrice}" />
  <meta property="product:price:currency" content="USD" />
  <meta property="product:availability" content="${availability}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokkishopve" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapedImageUrl}" />
  <meta name="twitter:image:alt" content="${escapedProductName}" />

  <!-- Fast client redirect fallback for human browsers -->
  <meta http-equiv="refresh" content="0;url=${escapedProductUrl}" />
  <script>
    window.location.replace("${productUrl}");
  </script>
</head>
<body>
  <h1>${escapedProductName}</h1>
  <p>${description}</p>
  <p><strong>Precio:</strong> ${escapeHtml(priceFormatted)}</p>
  <p><a href="${escapedProductUrl}">Ver producto en Tokki Shop</a></p>
</body>
</html>`;
}

export function buildFallbackOgHtml(targetUrl, options = {}) {
  const siteUrl = (options.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const finalUrl = targetUrl || siteUrl;
  const escapedTargetUrl = escapeHtml(finalUrl);
  const escapedTitle = escapeHtml(DEFAULT_TITLE);
  const escapedDesc = escapeHtml(DEFAULT_DESCRIPTION);
  const logoUrl = `${siteUrl}/tokki_logo.png`;
  const escapedLogoUrl = escapeHtml(logoUrl);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDesc}" />
  <meta name="theme-color" content="${THEME_COLOR}" />
  <link rel="canonical" href="${escapedTargetUrl}" />

  <!-- Open Graph / WhatsApp / Facebook / Discord -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${DEFAULT_SITE_NAME}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${escapedDesc}" />
  <meta property="og:url" content="${escapedTargetUrl}" />
  <meta property="og:image" content="${escapedLogoUrl}" />
  <meta property="og:image:secure_url" content="${escapedLogoUrl}" />
  <meta property="og:image:alt" content="${DEFAULT_SITE_NAME}" />
  <meta property="og:locale" content="es_VE" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokkishopve" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${escapedDesc}" />
  <meta name="twitter:image" content="${escapedLogoUrl}" />

  <!-- Fast client redirect fallback for human browsers -->
  <meta http-equiv="refresh" content="0;url=${escapedTargetUrl}" />
  <script>
    window.location.replace("${finalUrl}");
  </script>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <p>${escapedDesc}</p>
  <p><a href="${escapedTargetUrl}">Ir a Tokki Shop</a></p>
</body>
</html>`;
}

// ─────────────────────────────────────────────────
//  Fetch product from backend API -> serve OG HTML
// ─────────────────────────────────────────────────
export async function serveOgHtml(productId, res, config = {}) {
  const backendBase = (config.backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
  const siteUrl = (config.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');

  const idNum = parseInt(productId, 10);
  let html;

  if (isNaN(idNum) || idNum <= 0) {
    html = buildFallbackOgHtml(siteUrl, { siteUrl });
  } else {
    try {
      const apiUrl = `${backendBase}/api/products/${idNum}`;
      const response = await fetch(apiUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload?.success && payload.data) {
          html = buildProductOgHtml(payload.data, { siteUrl });
        } else {
          html = buildFallbackOgHtml(`${siteUrl}/products/${idNum}`, { siteUrl });
        }
      } else {
        html = buildFallbackOgHtml(`${siteUrl}/products/${idNum}`, { siteUrl });
      }
    } catch (err) {
      console.error(`[og-server] OG fetch error for product ${idNum}:`, err.message);
      html = buildFallbackOgHtml(`${siteUrl}/products/${idNum}`, { siteUrl });
    }
  }

  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
  });
  res.end(html);
}

// ─────────────────────────────────────────────────
//  Reverse proxy /api/* & /images/* -> backend
// ─────────────────────────────────────────────────
export function proxyRequest(clientReq, clientRes, backendUrl = DEFAULT_BACKEND_URL) {
  return new Promise((resolve) => {
    const targetUrl = new URL(clientReq.url, backendUrl);
    const requester = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;

    const fwdHeaders = { ...clientReq.headers, host: targetUrl.host };
    delete fwdHeaders['connection'];

    const proxyReq = requester(
      targetUrl,
      { method: clientReq.method, headers: fwdHeaders },
      (proxyRes) => {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
          clientRes.setHeader(k, v);
        }
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes);
        proxyRes.on('end', resolve);
        proxyRes.on('error', resolve);
      },
    );

    proxyReq.on('error', (err) => {
      console.error('[og-server] Proxy error:', err.message);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
        clientRes.end('Bad Gateway');
      }
      resolve();
    });

    clientReq.pipe(proxyReq);
  });
}

// ─────────────────────────────────────────────────
//  Static file serving from dist/
// ─────────────────────────────────────────────────
export async function serveStaticFile(pathname, res, distDir = DEFAULT_DIST_DIR) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }

  const cleanPath = decoded.replace(/^\/+/, '');
  const filePath = normalize(join(distDir, cleanPath));

  // Block path traversal
  if (!filePath.startsWith(distDir)) return false;

  try {
    const content = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    const cacheControl = pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600';

    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': content.length,
      'Cache-Control': cacheControl,
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────
//  SPA fallback -> dist/index.html
// ─────────────────────────────────────────────────
let cachedIndexHtml = null;

export async function serveSpaFallback(res, distDir = DEFAULT_DIST_DIR) {
  try {
    if (!cachedIndexHtml) {
      cachedIndexHtml = await readFile(join(distDir, 'index.html'));
    }
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(cachedIndexHtml);
  } catch (err) {
    console.error('[og-server] Failed to read index.html:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// ─────────────────────────────────────────────────
//  Main request router handler
// ─────────────────────────────────────────────────
export async function handleRequest(req, res, config = {}) {
  const port = config.port || DEFAULT_PORT;
  const distDir = config.distDir || DEFAULT_DIST_DIR;
  const backendUrl = config.backendUrl || DEFAULT_BACKEND_URL;
  const siteUrl = config.siteUrl || DEFAULT_SITE_URL;

  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = url.pathname;
  const ua = req.headers['user-agent'] || '';

  try {
    // 0) Container health checks (Coolify / Docker)
    if (pathname === '/health' || pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
      return;
    }

    // 1) Crawler hitting /products/:id -> serve OG HTML
    const productMatch = pathname.match(PRODUCT_RE);
    if (productMatch && CRAWLER_RE.test(ua)) {
      return await serveOgHtml(productMatch[1], res, { backendUrl, siteUrl });
    }

    // 2) Direct call to /api/og-product?id=... (backwards compatibility)
    if (pathname === '/api/og-product' || pathname === '/api/og-product/') {
      const id = url.searchParams.get('id');
      return await serveOgHtml(id, res, { backendUrl, siteUrl });
    }

    // 3) /api/* -> reverse proxy to backend
    if (pathname.startsWith('/api/')) {
      return await proxyRequest(req, res, backendUrl);
    }

    // 4) /images/* -> reverse proxy to backend
    if (pathname.startsWith('/images/')) {
      return await proxyRequest(req, res, backendUrl);
    }

    // 5) Try serving a static file from dist/
    if (await serveStaticFile(pathname, res, distDir)) return;

    // 6) SPA fallback for client-side routes
    await serveSpaFallback(res, distDir);
  } catch (err) {
    console.error('[og-server] Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
}

export function createOgServer(config = {}) {
  return createServer((req, res) => handleRequest(req, res, config));
}

// ─────────────────────────────────────────────────
//  Direct execution guard
// ─────────────────────────────────────────────────
let isDirectRun = false;
try {
  if (
    process.argv[1] &&
    process.env.NODE_ENV !== 'test' &&
    typeof import.meta?.url === 'string' &&
    import.meta.url.startsWith('file:') &&
    fileURLToPath(import.meta.url) === process.argv[1]
  ) {
    isDirectRun = true;
  } else if (
    process.argv[1] &&
    process.argv[1].endsWith('og-server.mjs') &&
    process.env.NODE_ENV !== 'test'
  ) {
    isDirectRun = true;
  }
} catch {
  isDirectRun = false;
}

if (isDirectRun) {
  const server = createOgServer();
  server.listen(DEFAULT_PORT, '0.0.0.0', () => {
    console.log(`[og-server] ✓ Listening on 0.0.0.0:${DEFAULT_PORT}`);
    console.log(`[og-server]   Backend  → ${DEFAULT_BACKEND_URL}`);
    console.log(`[og-server]   Site URL → ${DEFAULT_SITE_URL}`);
  });
}
