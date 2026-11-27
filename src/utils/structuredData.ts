import { CATEGORIES, slugify } from '../constants';
import { ROUTES } from '../lib/routes';
import type { Product } from '../types';
import { getEffectivePriceString } from './pricing';

const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL || 'https://www.tokkishopve.com'
).replace(/\/+$/, '');

export interface BreadcrumbItem {
  name: string;
  path: string;
}

function toAbsoluteUrl(rawUrl: string | null | undefined, siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  if (!rawUrl || !rawUrl.trim()) return `${base}/tokki_logo.png`;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${cleanPath}`;
}

function resolveProductImages(product: Product, siteUrl: string): string[] {
  const base = siteUrl.replace(/\/+$/, '');
  const candidates = [
    ...(product.product_image_urls ?? []),
    ...(product.product_image_url ? [product.product_image_url] : []),
  ];
  const seen = new Set<string>();
  const images: string[] = [];

  for (const raw of candidates) {
    if (!raw || !raw.trim()) continue;
    const abs = toAbsoluteUrl(raw, base);
    if (!seen.has(abs)) {
      seen.add(abs);
      images.push(abs);
    }
  }

  return images.length > 0 ? images : [`${base}/tokki_logo.png`];
}

export function buildBreadcrumbJsonLd(
  items: readonly BreadcrumbItem[],
  siteUrl = PUBLIC_SITE_URL,
): Record<string, unknown> {
  const base = siteUrl.replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${base}${item.path === '/' ? '/' : item.path}`,
    })),
  };
}

export function buildProductJsonLd(
  product: Product,
  siteUrl = PUBLIC_SITE_URL,
): Record<string, unknown> {
  const base = siteUrl.replace(/\/+$/, '');
  const productUrl = `${base}${ROUTES.product(product.product_id)}`;
  const isAvailable =
    Boolean(product.in_stock) &&
    (product.qty_available === undefined || product.qty_available > 0);
  const matchedCategory = CATEGORIES.find((cat) => cat.name === product.category);

  const breadcrumbItems: BreadcrumbItem[] = [{ name: 'Inicio', path: ROUTES.home }];
  if (matchedCategory) {
    breadcrumbItems.push({
      name: matchedCategory.name,
      path: ROUTES.category(slugify(matchedCategory.name)),
    });
  }
  breadcrumbItems.push({
    name: product.product_name,
    path: ROUTES.product(product.product_id),
  });

  const description = product.product_description?.trim()
    ? product.product_description.trim()
    : `${product.product_name} disponible en Tokki Shop. Envíos a toda Venezuela.`;

  const productNode: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.product_name,
    description,
    sku: String(product.product_id),
    image: resolveProductImages(product, base),
    brand: {
      '@type': 'Brand',
      name: 'Tokki Shop',
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
        name: 'Tokki Shop',
      },
    },
  };

  if (product.category?.trim()) {
    productNode.category = product.category.trim();
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      productNode,
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: item.name,
          item: `${base}${item.path === '/' ? '/' : item.path}`,
        })),
      },
    ],
  };
}
