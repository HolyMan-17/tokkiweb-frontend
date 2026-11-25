/**
 * og-server.mjs — Production server for Coolify / Docker deployment.
 *
 * Production server responsibilities:
 *  - Static SPA hosting (dist/) with per-route canonical / og:url / noindex injection
 *  - Dynamic /sitemap.xml generation (cached 1h, falls back to dist/sitemap.xml)
 *  - Trailing-slash 301 normalization
 *  - OG embed generation for social crawlers (WhatsApp, Discord, etc.)
 *  - Reverse-proxy (/api/*, /images/*)
 *  - Security headers
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

// ─── Crawler Detection (social embed crawlers only — search renderers get the real SPA) ─
export const CRAWLER_RE =
  /facebookexternalhit|facebot|twitterbot|telegrambot|whatsapp|discordbot|slackbot|linkedinbot|pinterest/i;
export const PRODUCT_RE = /^\/products\/(\d+)$/;

// ─── Known Storefront Categories (mirrors src/constants/index.ts) ─
export function slugifyCategory(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

export const KNOWN_CATEGORY_SLUGS = new Set([
  'menos-de-un-dolar',
  'zona-kpop',
  'albumes',
  'maquillaje',
  'skincare',
  'accesorios',
  'llaveros',
  'lentes-de-contacto',
  'pines-&-chapas',
  'ropa',
  'bolsos-y-carteras',
  'dulces-&-comida-asiatica',
  'peluches',
  'figuras',
  'papeleria',
  'bolsas-o-cajas-de-regalo',
  'cosplays',
  'para-ellos',
  'regalos-de-pareja',
  'bloques-de-construccion',
  'otros',
]);

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

// ─── Security Headers ───────────────────────────
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

function buildRedirectTags(targetUrl, escapedUrl, includeRedirect) {
  if (!includeRedirect) return '';
  const safeJsUrl = JSON.stringify(targetUrl);
  return `
  <!-- Fast client redirect fallback for human browsers -->
  <meta http-equiv="refresh" content="0;url=${escapedUrl}" />
  <script>
    window.location.replace(${safeJsUrl});
  </script>`;
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
  const redirectTags = buildRedirectTags(
    productUrl,
    escapedProductUrl,
    options.includeRedirect === true,
  );

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
  <meta name="twitter:image:alt" content="${escapedProductName}" />${redirectTags}
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
  const noindex = options.noindex === true;
  const robotsOrCanonical = noindex
    ? '<meta name="robots" content="noindex, nofollow" />'
    : `<link rel="canonical" href="${escapedTargetUrl}" />`;
  const redirectTags = buildRedirectTags(
    finalUrl,
    escapedTargetUrl,
    options.includeRedirect === true,
  );

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${escapedDesc}" />
  <meta name="theme-color" content="${THEME_COLOR}" />
  ${robotsOrCanonical}

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
  <meta name="twitter:image" content="${escapedLogoUrl}" />${redirectTags}
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
  const includeRedirect = config.includeRedirect === true;

  const idNum = parseInt(productId, 10);
  let html;
  let statusCode = 200;
  let isNotFound = false;
  let cacheControl = 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400';

  if (isNaN(idNum) || idNum <= 0) {
    statusCode = 404;
    isNotFound = true;
    html = buildFallbackOgHtml(siteUrl, { siteUrl, includeRedirect, noindex: true });
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
          html = buildProductOgHtml(payload.data, { siteUrl, includeRedirect });
        } else {
          statusCode = 404;
          isNotFound = true;
          html = buildFallbackOgHtml(`${siteUrl}/products/${idNum}`, {
            siteUrl,
            includeRedirect,
            noindex: true,
          });
        }
      } else if (response.status === 404) {
        statusCode = 404;
        isNotFound = true;
        html = buildFallbackOgHtml(`${siteUrl}/products/${idNum}`, {
          siteUrl,
          includeRedirect,
          noindex: true,
        });
      } else {
        cacheControl = 'no-cache';
        html = buildFallbackOgHtml(`${siteUrl}/products/${idNum}`, {
          siteUrl,
          includeRedirect,
        });
      }
    } catch (err) {
      console.error(`[og-server] OG fetch error for product ${idNum}:`, err.message);
      cacheControl = 'no-cache';
      html = buildFallbackOgHtml(`${siteUrl}/products/${idNum}`, {
        siteUrl,
        includeRedirect,
      });
    }
  }

  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  if (isNotFound) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    cacheControl = 'public, max-age=60';
  }
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': cacheControl,
  });
  res.end(html);
}

// ─────────────────────────────────────────────────
//  SPA Route Classification & Head Meta Injection
// ─────────────────────────────────────────────────
export function classifySpaRoute(pathname) {
  if (pathname === '/' || pathname === '/productos' || PRODUCT_RE.test(pathname)) {
    return { status: 200, indexable: true, canonicalPath: pathname };
  }

  if (pathname.startsWith('/categorias/')) {
    const rawSlug = pathname.slice('/categorias/'.length);
    if (rawSlug && !rawSlug.includes('/')) {
      let decodedSlug = rawSlug;
      try {
        decodedSlug = decodeURIComponent(rawSlug);
      } catch {
        return { status: 404, indexable: false, canonicalPath: null };
      }
      if (KNOWN_CATEGORY_SLUGS.has(decodedSlug)) {
        return {
          status: 200,
          indexable: true,
          canonicalPath: `/categorias/${decodedSlug}`,
        };
      }
    }
    return { status: 404, indexable: false, canonicalPath: null };
  }

  if (
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname === '/confirmation' ||
    pathname.startsWith('/confirmation/') ||
    pathname === '/tokki-admin' ||
    pathname.startsWith('/tokki-admin/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  ) {
    return { status: 200, indexable: false, canonicalPath: null };
  }

  return { status: 404, indexable: false, canonicalPath: null };
}

export function rewriteIndexHtml(html, { siteUrl = DEFAULT_SITE_URL, canonicalPath, indexable }) {
  const base = siteUrl.replace(/\/+$/, '');

  if (indexable && canonicalPath) {
    const normalizedPath = canonicalPath === '/' ? '/' : canonicalPath;
    const escapedCanonicalUrl = escapeHtml(`${base}${normalizedPath}`);
    return html
      .replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapedCanonicalUrl}" />`,
      )
      .replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:url" content="${escapedCanonicalUrl}" />`,
      );
  }

  return html
    .replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, '')
    .replace(
      /<\/head>/i,
      '    <meta name="robots" content="noindex, nofollow" />\n  </head>',
    );
}

// ─────────────────────────────────────────────────
//  Dynamic /sitemap.xml (cached 1h, fallback to static)
// ─────────────────────────────────────────────────
const SITEMAP_CACHE_TTL_MS = 3600_000;
let cachedSitemapXml = null;
let cachedSitemapAt = 0;

export function clearSitemapCache() {
  cachedSitemapXml = null;
  cachedSitemapAt = 0;
}

export function buildSitemapXml(products, siteUrl = DEFAULT_SITE_URL) {
  const base = siteUrl.replace(/\/+$/, '');
  const urls = [
    { loc: `${base}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${base}/productos`, changefreq: 'daily', priority: '0.9' },
  ];

  const populatedSlugs = new Set();
  const productIds = [];
  const seenIds = new Set();

  for (const row of products) {
    if (row && typeof row.category === 'string') {
      const slug = slugifyCategory(row.category);
      if (KNOWN_CATEGORY_SLUGS.has(slug)) {
        populatedSlugs.add(slug);
      }
    }
    const id = Number(row?.product_id);
    if (Number.isInteger(id) && id > 0 && !seenIds.has(id)) {
      seenIds.add(id);
      productIds.push(id);
    }
  }

  for (const slug of KNOWN_CATEGORY_SLUGS) {
    if (populatedSlugs.has(slug)) {
      urls.push({
        loc: `${base}/categorias/${slug}`,
        changefreq: 'weekly',
        priority: '0.8',
      });
    }
  }

  productIds.sort((a, b) => b - a);
  for (const id of productIds) {
    urls.push({
      loc: `${base}/products/${id}`,
      changefreq: 'daily',
      priority: '0.7',
    });
  }

  const entries = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeHtml(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export async function serveDynamicSitemap(res, config = {}) {
  const backendBase = (config.backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
  const siteUrl = (config.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const distDir = config.distDir || DEFAULT_DIST_DIR;

  const now = Date.now();
  if (cachedSitemapXml && now - cachedSitemapAt < SITEMAP_CACHE_TTL_MS) {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    res.writeHead(200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    });
    res.end(cachedSitemapXml);
    return;
  }

  try {
    const response = await fetch(`${backendBase}/api/products`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const payload = await response.json();
      const rows = Array.isArray(payload?.data) ? payload.data : null;
      if (rows) {
        const xml = buildSitemapXml(rows, siteUrl);
        cachedSitemapXml = xml;
        cachedSitemapAt = now;
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
        res.writeHead(200, {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        });
        res.end(xml);
        return;
      }
    }
  } catch (err) {
    console.error('[og-server] Sitemap fetch error:', err.message);
  }

  if (await serveStaticFile('/sitemap.xml', res, distDir)) return;

  res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end('Sitemap unavailable');
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

export async function serveSpaFallback(res, distDir = DEFAULT_DIST_DIR, options = {}) {
  const pathname = options.pathname || '/';
  const siteUrl = options.siteUrl || DEFAULT_SITE_URL;

  try {
    if (!cachedIndexHtml) {
      cachedIndexHtml = await readFile(join(distDir, 'index.html'), 'utf8');
    }
    const routeInfo = classifySpaRoute(pathname);
    const html = rewriteIndexHtml(cachedIndexHtml, {
      siteUrl,
      canonicalPath: routeInfo.canonicalPath,
      indexable: routeInfo.indexable,
    });

    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    if (!routeInfo.indexable) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    res.writeHead(routeInfo.status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(html);
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

    // 1) Social crawler hitting /products/:id -> serve OG HTML (no self-redirect)
    const productMatch = pathname.match(PRODUCT_RE);
    if (productMatch && CRAWLER_RE.test(ua)) {
      return await serveOgHtml(productMatch[1], res, {
        backendUrl,
        siteUrl,
        includeRedirect: false,
      });
    }

    // 2) Direct call to /api/og-product?id=... (backwards compatibility)
    if (pathname === '/api/og-product' || pathname === '/api/og-product/') {
      const id = url.searchParams.get('id');
      return await serveOgHtml(id, res, {
        backendUrl,
        siteUrl,
        includeRedirect: true,
      });
    }

    // 3) /api/* -> reverse proxy to backend
    if (pathname.startsWith('/api/')) {
      return await proxyRequest(req, res, backendUrl);
    }

    // 4) /images/* -> reverse proxy to backend
    if (pathname.startsWith('/images/')) {
      return await proxyRequest(req, res, backendUrl);
    }

    // 5) Trailing-slash normalization (301 redirect) for non-root paths
    if (pathname.length > 1 && pathname.endsWith('/')) {
      const cleanPath = pathname.replace(/\/+$/, '') || '/';
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
      res.writeHead(301, {
        Location: `${cleanPath}${url.search}`,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end();
      return;
    }

    // 6) Dynamic /sitemap.xml (falls back to static dist/sitemap.xml)
    if (pathname === '/sitemap.xml') {
      return await serveDynamicSitemap(res, { backendUrl, siteUrl, distDir });
    }

    // 7) Try serving a static file from dist/
    if (await serveStaticFile(pathname, res, distDir)) return;

    // 8) SPA fallback for client-side routes (with per-route canonical / noindex / 404 status)
    await serveSpaFallback(res, distDir, { pathname, siteUrl });
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
