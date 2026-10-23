export interface ProductData {
  product_id: number;
  product_name: string;
  product_price: string | number;
  product_description?: string | null;
  category?: string;
  qty_available?: number;
  in_stock?: boolean;
  product_image_url?: string | null;
}

export interface OgOptions {
  siteUrl?: string;
  targetUrl?: string;
}

export interface NodeReq {
  query?: Record<string, string | string[]>;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface NodeRes {
  statusCode?: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string) => void;
}

declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_BACKEND_URL = 'https://api.tokkishopve.com';
const DEFAULT_SITE_URL = 'https://www.tokkishopve.com';
const DEFAULT_SITE_NAME = 'Tokki Shop';
const DEFAULT_TITLE = 'Tokki Shop — Accesorios y Dulces Coreanos';
const DEFAULT_DESCRIPTION =
  'Tienda asiatica de maquillaje, skincare, accesorios, lentes de contacto, pines, ropa, peluches, dulces y comida asiática. Envíos a toda Venezuela. 🐰';
const THEME_COLOR = '#e68bbe';

export const CATEGORIES: { name: string }[] = [
  { name: 'Zona KPOP' },
  { name: 'Albumes' },
  { name: 'Maquillaje' },
  { name: 'Skincare' },
  { name: 'Accesorios' },
  { name: 'Lentes de Contacto' },
  { name: 'Pines & Chapas' },
  { name: 'Ropa' },
  { name: 'Bolsos y Carteras' },
  { name: 'Dulces & Comida Asiatica' },
  { name: 'Peluches' },
  { name: 'Figuras' },
  { name: 'Bolsas o cajas de regalo' },
  { name: 'Cosplays' },
  { name: 'Para ellos' },
  { name: 'Regalos de pareja' },
  { name: 'Bloques de construccion' },
  { name: 'Otros' },
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function cleanCanonicalUrl(
  rawUrl: string,
  siteUrl: string = DEFAULT_SITE_URL,
): string {
  const base = (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  let resolvedPath: string;
  try {
    const parsed = new URL(rawUrl, base);
    resolvedPath = parsed.pathname;
  } catch {
    resolvedPath = rawUrl.split('?')[0].split('#')[0];
  }
  const cleanPath = resolvedPath.split('?')[0].split('#')[0];
  const normalized = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  if (normalized === '/') return `${base}/`;
  return `${base}${normalized.replace(/\/+$/, '')}`;
}

export function formatPrice(price: string | number): string {
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

function resolveImageUrl(rawUrl: string | null | undefined, siteUrl: string): string {
  if (!rawUrl || rawUrl.trim() === '') {
    return `${siteUrl}/tokki_logo.png`;
  }
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }
  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${siteUrl}${cleanPath}`;
}

export function buildProductOgHtml(product: ProductData, options: OgOptions = {}): string {
  const siteUrl = (options.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const productUrl = `${siteUrl}/products/${product.product_id}`;
  const priceFormatted = formatPrice(product.product_price);
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
  const isAvailable = product.in_stock && (product.qty_available === undefined || product.qty_available > 0);
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

export function buildCategoryOgHtml(categorySlug: string, options: OgOptions = {}): string {
  const siteUrl = (options.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const cleanSlug = categorySlug.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
  const category = CATEGORIES.find((c) => slugify(c.name) === cleanSlug);
  const categoryName = category ? category.name : cleanSlug;
  const cleanCategoryUrl = `${siteUrl}/categorias/${cleanSlug}`;
  const title = `${categoryName} — ${DEFAULT_SITE_NAME}`;
  const rawDesc = `Descubre nuestra colección de ${categoryName} en Tokki Shop. Envíos a toda Venezuela. 🐰`;
  const description = escapeHtml(rawDesc);
  const escapedTitle = escapeHtml(title);
  const logoUrl = `${siteUrl}/tokki_logo.png`;
  const escapedLogoUrl = escapeHtml(logoUrl);
  const escapedCategoryUrl = escapeHtml(cleanCategoryUrl);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <meta name="description" content="${description}" />
  <meta name="theme-color" content="${THEME_COLOR}" />
  <link rel="canonical" href="${escapedCategoryUrl}" />

  <!-- Open Graph / WhatsApp / Facebook / Discord -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${DEFAULT_SITE_NAME}" />
  <meta property="og:title" content="${escapedTitle}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${escapedCategoryUrl}" />
  <meta property="og:image" content="${escapedLogoUrl}" />
  <meta property="og:image:secure_url" content="${escapedLogoUrl}" />
  <meta property="og:image:alt" content="${escapeHtml(categoryName)}" />
  <meta property="og:locale" content="es_VE" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokkishopve" />
  <meta name="twitter:title" content="${escapedTitle}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${escapedLogoUrl}" />

  <!-- Fast client redirect fallback for human browsers -->
  <meta http-equiv="refresh" content="0;url=${escapedCategoryUrl}" />
  <script>
    window.location.replace("${cleanCategoryUrl}");
  </script>
</head>
<body>
  <h1>${escapeHtml(categoryName)}</h1>
  <p>${description}</p>
  <p><a href="${escapedCategoryUrl}">Ver ${escapeHtml(categoryName)} en Tokki Shop</a></p>
</body>
</html>`;
}

export function buildFallbackOgHtml(options: OgOptions = {}): string {
  const siteUrl = (options.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const cleanTargetUrl = cleanCanonicalUrl(options.targetUrl || siteUrl, siteUrl);
  const escapedTargetUrl = escapeHtml(cleanTargetUrl);
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
    window.location.replace("${cleanTargetUrl}");
  </script>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <p>${escapedDesc}</p>
  <p><a href="${escapedTargetUrl}">Ir a Tokki Shop</a></p>
</body>
</html>`;
}

function extractProductId(req: Request | NodeReq): number {
  if ('url' in req && req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const idParam = url.searchParams.get('id');
      if (idParam) {
        const parsed = parseInt(idParam, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // Fall through to query inspection
    }
  }

  if ('query' in req && req.query && req.query.id) {
    const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  return NaN;
}

function extractCategorySlug(req: Request | NodeReq): string | null {
  if ('url' in req && req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const catParam = url.searchParams.get('category');
      if (catParam && catParam.trim() !== '') return catParam.trim();
    } catch {
      // Fall through to query inspection
    }
  }

  if ('query' in req && req.query && req.query.category) {
    const raw = Array.isArray(req.query.category)
      ? req.query.category[0]
      : req.query.category;
    if (raw && raw.trim() !== '') return raw.trim();
  }

  return null;
}

export default async function handler(
  req: Request | NodeReq,
  res?: NodeRes,
): Promise<Response | void> {
  const siteUrl = process.env.VITE_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const backendBase = (process.env.BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');

  const productId = extractProductId(req);
  const categorySlug = extractCategorySlug(req);
  let html: string;

  if (!isNaN(productId) && productId > 0) {
    try {
      const apiEndpoint = `${backendBase}/api/products/${productId}`;
      const response = await fetch(apiEndpoint, {
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const payload = (await response.json()) as { success?: boolean; data?: ProductData };
        if (payload?.success && payload.data) {
          html = buildProductOgHtml(payload.data, { siteUrl });
        } else {
          html = buildFallbackOgHtml({
            siteUrl,
            targetUrl: `${siteUrl}/products/${productId}`,
          });
        }
      } else {
        html = buildFallbackOgHtml({
          siteUrl,
          targetUrl: `${siteUrl}/products/${productId}`,
        });
      }
    } catch {
      html = buildFallbackOgHtml({
        siteUrl,
        targetUrl: `${siteUrl}/products/${productId}`,
      });
    }
  } else if (categorySlug) {
    html = buildCategoryOgHtml(categorySlug, { siteUrl });
  } else {
    html = buildFallbackOgHtml({ siteUrl });
  }

  // Node.js Serverless runtime (res.end & res.setHeader are native Node.js methods)
  if (res && typeof res.setHeader === 'function' && typeof res.end === 'function') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
    );
    res.statusCode = 200;
    res.end(html);
    return;
  }

  // Web API / Edge runtime
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
