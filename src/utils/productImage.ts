// ─── Responsive Product Image URLs ────────────────────────────────────────────
// Rewrites backend-hosted product WebPs (`/images/products/<uuid>.webp`) to
// width-constrained variants (`?w=400` / `?w=800`) so mobile and grid cards do
// not download full 1600px uploads. External and legacy URLs pass through unchanged.

const OPTIMIZABLE_PRODUCT_IMAGE_RE = /\/images\/products\/[0-9a-f-]{36}\.webp$/i;

export type ProductImageWidth = 400 | 800;

export interface ResponsiveImageAttrs {
  src: string;
  srcSet?: string;
  sizes?: string;
}

export function isOptimizableProductImage(url: string): boolean {
  return Boolean(url) && OPTIMIZABLE_PRODUCT_IMAGE_RE.test(url);
}

export function getProductImageUrl(url: string, width: ProductImageWidth): string {
  if (!isOptimizableProductImage(url)) return url;
  return `${url}?w=${width}`;
}

export function getProductCardImageAttrs(url: string): ResponsiveImageAttrs {
  if (!isOptimizableProductImage(url)) {
    return { src: url };
  }
  return {
    src: `${url}?w=400`,
    srcSet: `${url}?w=400 400w, ${url}?w=800 800w`,
    sizes: '(min-width: 768px) 240px, 46vw',
  };
}

export function getProductGalleryImageAttrs(url: string): ResponsiveImageAttrs {
  if (!isOptimizableProductImage(url)) {
    return { src: url };
  }
  return {
    src: `${url}?w=800`,
    srcSet: `${url}?w=400 400w, ${url}?w=800 800w, ${url} 1600w`,
    sizes: '(min-width: 768px) 480px, 100vw',
  };
}

export function getProductThumbUrl(url: string): string {
  return getProductImageUrl(url, 400);
}
