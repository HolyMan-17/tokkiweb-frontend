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
import { brotliCompressSync, gzipSync, constants as zlibConstants } from 'node:zlib';
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
  'regalos-listo-para-entrega',
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

export function normalizeDiscountPercent(raw) {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return 0;
  if (raw < 0 || raw > 99) return 0;
  return raw;
}

export function getEffectivePriceString(product) {
  const raw = product?.product_price;
  const base = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!Number.isFinite(base) || base <= 0) return '0.00';
  const baseCents = Math.round(base * 100);
  const pct = normalizeDiscountPercent(product?.discount_percent);
  const effectiveCents = Math.round((baseCents * (100 - pct)) / 100);
  return (effectiveCents / 100).toFixed(2);
}

export function resolveImageUrl(rawUrl, siteUrl = DEFAULT_SITE_URL) {
  const base = siteUrl.replace(/\/+$/, '');
  if (!rawUrl || rawUrl.trim() === '') return `${base}/tokki_logo.png`;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${base}${cleanPath}`;
}

export function serializeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function resolveProductImages(product, siteUrl = DEFAULT_SITE_URL) {
  const base = siteUrl.replace(/\/+$/, '');
  const gallery = Array.isArray(product?.product_image_urls) ? product.product_image_urls : [];
  const candidates = [...gallery, product?.product_image_url];
  const seen = new Set();
  const images = [];

  for (const raw of candidates) {
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    const abs = resolveImageUrl(raw.trim(), base);
    if (!seen.has(abs)) {
      seen.add(abs);
      images.push(abs);
    }
  }

  return images.length > 0 ? images : [`${base}/tokki_logo.png`];
}

function buildProductDescription(product) {
  return product?.product_description?.trim()
    ? `${product.product_description.trim()} • Envíos a toda Venezuela 🐰`
    : `Disponible en Tokki Shop — ${DEFAULT_DESCRIPTION}`;
}

function isProductInStock(product) {
  return Boolean(product?.in_stock) && (product.qty_available === undefined || product.qty_available > 0);
}

export function buildProductJsonLd(product, siteUrl = DEFAULT_SITE_URL) {
  const base = siteUrl.replace(/\/+$/, '');
  const productUrl = `${base}/products/${product.product_id}`;
  const isAvailable = isProductInStock(product);
  const rawCategory = typeof product?.category === 'string' ? product.category.trim() : '';
  const categorySlug = rawCategory ? slugifyCategory(rawCategory) : '';

  const breadcrumbItems = [{ name: 'Inicio', item: `${base}/` }];
  if (rawCategory && KNOWN_CATEGORY_SLUGS.has(categorySlug)) {
    breadcrumbItems.push({
      name: rawCategory,
      item: `${base}/categorias/${categorySlug}`,
    });
  }
  breadcrumbItems.push({
    name: product.product_name,
    item: productUrl,
  });

  const description = product?.product_description?.trim()
    ? product.product_description.trim()
    : `${product.product_name} disponible en Tokki Shop. Envíos a toda Venezuela.`;

  const productNode = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.product_name,
    description,
    sku: String(product.product_id),
    image: resolveProductImages(product, base),
    brand: {
      '@type': 'Brand',
      name: DEFAULT_SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'USD',
      price: getEffectivePriceString(product),
      availability: isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Store',
        '@id': `${base}/#store`,
        name: DEFAULT_SITE_NAME,
      },
    },
  };

  if (rawCategory) {
    productNode.category = rawCategory;
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      productNode,
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((entry, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: entry.name,
          item: entry.item,
        })),
      },
    ],
  };
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
  const effectivePriceStr = getEffectivePriceString(product);
  const priceFormatted = ogFormatPrice(effectivePriceStr);
  const title = `${product.product_name} — ${priceFormatted} | ${DEFAULT_SITE_NAME}`;

  const rawDesc = buildProductDescription(product);
  const description = escapeHtml(rawDesc);
  const escapedTitle = escapeHtml(title);
  const images = resolveProductImages(product, siteUrl);
  const imageUrl = images[0];
  const escapedImageUrl = escapeHtml(imageUrl);
  const escapedProductUrl = escapeHtml(productUrl);
  const escapedProductName = escapeHtml(product.product_name);
  const availability = isProductInStock(product) ? 'in stock' : 'out of stock';
  const numericPrice = escapeHtml(effectivePriceStr);
  const jsonLdScript = `<script type="application/ld+json" data-tokki-jsonld="route">${serializeJsonLd(buildProductJsonLd(product, siteUrl))}</script>`;
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
  <meta name="twitter:image:alt" content="${escapedProductName}" />
  ${jsonLdScript}${redirectTags}
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

export function rewriteIndexHtml(
  html,
  { siteUrl = DEFAULT_SITE_URL, canonicalPath, indexable, product = null },
) {
  const base = siteUrl.replace(/\/+$/, '');

  if (indexable && canonicalPath) {
    const normalizedPath = canonicalPath === '/' ? '/' : canonicalPath;
    const escapedCanonicalUrl = escapeHtml(`${base}${normalizedPath}`);
    let updated = html
      .replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        () => `<link rel="canonical" href="${escapedCanonicalUrl}" />`,
      )
      .replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
        () => `<meta property="og:url" content="${escapedCanonicalUrl}" />`,
      );

    if (product) {
      const priceFormatted = ogFormatPrice(getEffectivePriceString(product));
      const escapedTitle = escapeHtml(`${product.product_name} — ${priceFormatted} | ${DEFAULT_SITE_NAME}`);
      const escapedDesc = escapeHtml(buildProductDescription(product));
      const rawImage = resolveProductImages(product, base)[0];
      const escapedImage = escapeHtml(rawImage);
      const preloadTag = /\/images\/products\/[0-9a-f-]{36}\.webp$/i.test(rawImage)
        ? `<link rel="preload" as="image" href="${escapedImage}?w=800" imagesrcset="${escapedImage}?w=400 400w, ${escapedImage}?w=800 800w, ${escapedImage} 1600w" imagesizes="(min-width: 768px) 480px, 100vw" fetchpriority="high" />`
        : `<link rel="preload" as="image" href="${escapedImage}" fetchpriority="high" />`;
      const jsonLdScript = `<script type="application/ld+json" data-tokki-jsonld="route">${serializeJsonLd(buildProductJsonLd(product, base))}</script>`;
      const bootstrapScript = `<script data-tokki-bootstrap="product">window.__TOKKI_INITIAL_PRODUCT__=${serializeJsonLd(product)};</script>`;

      updated = updated
        .replace(/<title>[^<]*<\/title>/i, () => `<title>${escapedTitle}</title>`)
        .replace(
          /<meta\b[^>]*\bname="description"[^>]*>/i,
          () => `<meta name="description" content="${escapedDesc}" />`,
        )
        .replace(
          /<meta\b[^>]*\bproperty="og:title"[^>]*>/i,
          () => `<meta property="og:title" content="${escapedTitle}" />`,
        )
        .replace(
          /<meta\b[^>]*\bproperty="og:description"[^>]*>/i,
          () => `<meta property="og:description" content="${escapedDesc}" />`,
        )
        .replace(
          /<meta\b[^>]*\bproperty="og:image"[^>]*>/i,
          () => `<meta property="og:image" content="${escapedImage}" />`,
        )
        .replace(
          /<meta\b[^>]*\bname="twitter:title"[^>]*>/i,
          () => `<meta name="twitter:title" content="${escapedTitle}" />`,
        )
        .replace(
          /<meta\b[^>]*\bname="twitter:description"[^>]*>/i,
          () => `<meta name="twitter:description" content="${escapedDesc}" />`,
        )
        .replace(
          /<meta\b[^>]*\bname="twitter:image"[^>]*>/i,
          () => `<meta name="twitter:image" content="${escapedImage}" />`,
        )
        .replace(/<\/head>/i, () => `    ${preloadTag}\n    ${jsonLdScript}\n    ${bootstrapScript}\n  </head>`);
    }

    return updated;
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
//  Compression & Static file serving from dist/
// ─────────────────────────────────────────────────
const COMPRESSIBLE_EXTS = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.svg',
  '.txt',
  '.xml',
  '.webmanifest',
]);
const LONG_CACHE_EXTS = new Set([
  '.png',
  '.ico',
  '.svg',
  '.webp',
  '.avif',
  '.jpg',
  '.jpeg',
  '.woff2',
  '.webmanifest',
]);
const MIN_COMPRESS_BYTES = 1024;
const MAX_STATIC_CACHE_ENTRIES = 200;
const staticFileCache = new Map();

export function clearStaticFileCache() {
  staticFileCache.clear();
}

export function negotiateEncoding(acceptEncoding = '') {
  if (typeof acceptEncoding !== 'string' || !acceptEncoding) return null;
  const lower = acceptEncoding.toLowerCase();
  if (/\bbr\b/.test(lower)) return 'br';
  if (/\bgzip\b/.test(lower)) return 'gzip';
  return null;
}

function compressBuffer(buf, encoding) {
  if (encoding === 'br') {
    return brotliCompressSync(buf, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 },
    });
  }
  if (encoding === 'gzip') {
    return gzipSync(buf, { level: 6 });
  }
  return buf;
}

export async function serveStaticFile(
  pathname,
  res,
  distDir = DEFAULT_DIST_DIR,
  acceptEncoding = '',
) {
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
    const ext = extname(filePath).toLowerCase();
    let entry = staticFileCache.get(filePath);
    if (!entry) {
      const raw = await readFile(filePath);
      entry = {
        raw,
        mime: MIME_TYPES[ext] || 'application/octet-stream',
        compressible: COMPRESSIBLE_EXTS.has(ext),
      };
      if (staticFileCache.size >= MAX_STATIC_CACHE_ENTRIES) {
        const oldestKey = staticFileCache.keys().next().value;
        if (oldestKey !== undefined) staticFileCache.delete(oldestKey);
      }
      staticFileCache.set(filePath, entry);
    }

    const cacheControl = pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable'
      : LONG_CACHE_EXTS.has(ext)
        ? 'public, max-age=2592000'
        : 'public, max-age=3600';

    const encoding =
      entry.compressible && entry.raw.length >= MIN_COMPRESS_BYTES
        ? negotiateEncoding(acceptEncoding)
        : null;

    let payload = entry.raw;
    if (encoding) {
      if (!entry[encoding]) {
        entry[encoding] = compressBuffer(entry.raw, encoding);
      }
      payload = entry[encoding];
    }

    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    const headers = {
      'Content-Type': entry.mime,
      'Content-Length': payload.length,
      'Cache-Control': cacheControl,
    };
    if (encoding) {
      headers['Content-Encoding'] = encoding;
      headers['Vary'] = 'Accept-Encoding';
    }
    res.writeHead(200, headers);
    res.end(payload);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────
//  Product Metadata Cache & SPA Fallback -> dist/index.html
// ─────────────────────────────────────────────────
const PRODUCT_META_CACHE_TTL_MS = 5 * 60_000;
const MAX_PRODUCT_META_CACHE = 500;
const productMetaCache = new Map();

export function clearProductMetaCache() {
  productMetaCache.clear();
}

async function fetchProductForSpa(productId, backendBase) {
  const idNum = parseInt(productId, 10);
  if (isNaN(idNum) || idNum <= 0) return { status: 'not_found' };

  const now = Date.now();
  const cached = productMetaCache.get(idNum);
  if (cached && now - cached.at < PRODUCT_META_CACHE_TTL_MS) {
    return { status: 'ok', product: cached.product };
  }

  try {
    const response = await fetch(`${backendBase}/api/products/${idNum}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(1500),
    });

    if (response.ok) {
      const payload = await response.json();
      if (payload?.success && payload.data) {
        if (productMetaCache.size >= MAX_PRODUCT_META_CACHE) {
          const oldestKey = productMetaCache.keys().next().value;
          if (oldestKey !== undefined) productMetaCache.delete(oldestKey);
        }
        productMetaCache.set(idNum, { at: now, product: payload.data });
        return { status: 'ok', product: payload.data };
      }
      return { status: 'not_found' };
    }

    if (response.status === 404) {
      return { status: 'not_found' };
    }

    return { status: 'error' };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[og-server] SPA product meta error for ${idNum}:`, err.message);
    }
    return { status: 'error' };
  }
}

let cachedIndexHtml = null;

export async function serveSpaFallback(res, distDir = DEFAULT_DIST_DIR, options = {}) {
  const pathname = options.pathname || '/';
  const siteUrl = options.siteUrl || DEFAULT_SITE_URL;
  const backendBase = options.backendUrl ? options.backendUrl.replace(/\/+$/, '') : '';
  const acceptEncoding = options.acceptEncoding || '';

  try {
    if (!cachedIndexHtml) {
      cachedIndexHtml = await readFile(join(distDir, 'index.html'), 'utf8');
    }
    let routeInfo = classifySpaRoute(pathname);
    let product = null;

    if (routeInfo.indexable && backendBase) {
      const productMatch = pathname.match(PRODUCT_RE);
      if (productMatch) {
        const lookup = await fetchProductForSpa(productMatch[1], backendBase);
        if (lookup.status === 'ok') {
          product = lookup.product;
        } else if (lookup.status === 'not_found') {
          routeInfo = { status: 404, indexable: false, canonicalPath: null };
        }
      }
    }

    const html = rewriteIndexHtml(cachedIndexHtml, {
      siteUrl,
      canonicalPath: routeInfo.canonicalPath,
      indexable: routeInfo.indexable,
      product,
    });

    const raw = Buffer.from(html, 'utf8');
    const encoding = raw.length >= MIN_COMPRESS_BYTES ? negotiateEncoding(acceptEncoding) : null;
    const payload = encoding ? compressBuffer(raw, encoding) : raw;

    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    if (!routeInfo.indexable) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    const headers = {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': payload.length,
      'Cache-Control': routeInfo.indexable
        ? 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
        : 'no-cache',
    };
    if (encoding) {
      headers['Content-Encoding'] = encoding;
      headers['Vary'] = 'Accept-Encoding';
    }
    res.writeHead(routeInfo.status, headers);
    res.end(payload);
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
  const acceptEncoding = req.headers['accept-encoding'] || '';

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
    if (await serveStaticFile(pathname, res, distDir, acceptEncoding)) return;

    // 8) SPA fallback for client-side routes (with per-route canonical / noindex / 404 / Product JSON-LD)
    await serveSpaFallback(res, distDir, { pathname, siteUrl, backendUrl, acceptEncoding });
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
