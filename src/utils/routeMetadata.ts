import { CATEGORIES, slugify } from '../constants';
import { ADMIN_PATH } from '../lib/auth';
import { ADMIN_ROUTES, ROUTES } from '../lib/routes';

const DEFAULT_SITE_URL = 'https://www.tokkishopve.com';
export const DEFAULT_PAGE_TITLE = 'Tokki Shop — Accesorios y Dulces Coreanos';

export function getCleanCanonicalUrl(
  pathname: string,
  siteUrl: string = DEFAULT_SITE_URL,
): string {
  const base = (siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '');
  let resolvedPath: string;
  try {
    const parsed = new URL(pathname, base);
    resolvedPath = parsed.pathname;
  } catch {
    resolvedPath = pathname.split('?')[0].split('#')[0];
  }
  const cleanPath = resolvedPath.split('?')[0].split('#')[0];
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  if (normalizedPath === '/') {
    return `${base}/`;
  }

  // Remove trailing slashes for subroutes
  return `${base}${normalizedPath.replace(/\/+$/, '')}`;
}

export function getRouteTitle(pathname: string): string {
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  if (cleanPath === ROUTES.home) {
    return DEFAULT_PAGE_TITLE;
  }
  if (cleanPath === ROUTES.allProducts) {
    return 'Todos los Productos — Tokki Shop';
  }
  if (cleanPath === ROUTES.cart) {
    return 'Carrito de Compras — Tokki Shop';
  }
  if (cleanPath === ROUTES.checkout) {
    return 'Finalizar Compra — Tokki Shop';
  }
  if (cleanPath.startsWith('/confirmation')) {
    return 'Confirmación de Pedido — Tokki Shop';
  }
  if (cleanPath.startsWith('/categorias/')) {
    const slug = cleanPath.replace('/categorias/', '').split('/')[0];
    const category = CATEGORIES.find((c) => slugify(c.name) === slug);
    if (category) {
      return `${category.name} — Tokki Shop`;
    }
    return 'Categoría — Tokki Shop';
  }
  if (cleanPath.startsWith('/products/')) {
    return 'Producto — Tokki Shop';
  }
  if (cleanPath.startsWith(ADMIN_PATH)) {
    if (cleanPath === ADMIN_ROUTES.createOrder) {
      return 'Crear Pedido — Tokki Shop';
    }
    if (cleanPath === ADMIN_ROUTES.orders) {
      return 'Pedidos — Tokki Shop';
    }
    if (cleanPath.startsWith(`${ADMIN_ROUTES.orders}/`)) {
      return 'Detalle de Pedido — Tokki Shop';
    }
    if (cleanPath === ADMIN_ROUTES.products) {
      return 'Gestión de Productos — Tokki Shop';
    }
    if (cleanPath === ADMIN_ROUTES.dev) {
      return 'Dev Tools — Tokki Shop';
    }
    if (cleanPath === ADMIN_ROUTES.signIn) {
      return 'Iniciar Sesión — Tokki Shop';
    }
    return 'Panel de Administración — Tokki Shop';
  }

  return 'Página no encontrada — Tokki Shop';
}

export interface UpdateMetadataOptions {
  title?: string;
  siteUrl?: string;
}

export function updateDocumentMetadata(
  pathname: string,
  options: UpdateMetadataOptions = {},
): void {
  if (typeof document === 'undefined') return;

  const resolvedSiteUrl =
    options.siteUrl ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL) ||
    DEFAULT_SITE_URL;

  const canonicalUrl = getCleanCanonicalUrl(pathname, resolvedSiteUrl);

  // 1. Update <link rel="canonical">
  let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  // 2. Update <meta property="og:url"> so og:url and canonical always match
  let ogUrlMeta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!ogUrlMeta) {
    ogUrlMeta = document.createElement('meta');
    ogUrlMeta.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrlMeta);
  }
  ogUrlMeta.setAttribute('content', canonicalUrl);

  // 3. Update document.title
  const nextTitle = options.title || getRouteTitle(pathname);
  if (nextTitle) {
    document.title = nextTitle;
  }
}
