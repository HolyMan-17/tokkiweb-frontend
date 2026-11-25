import { useEffect } from 'react';

export const DEFAULT_DOC_TITLE = 'Tokki Shop — Accesorios y Dulces Coreanos';
export const DEFAULT_DOC_DESCRIPTION =
  'Tokki Shop: tienda asiatica de maquillaje, skincare, accesorios, lentes de contacto, pines, ropa, peluches, dulces y comida asiática. Envíos a toda Venezuela. 🐰';

const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL || 'https://www.tokkishopve.com'
).replace(/\/+$/, '');

export interface PageMetaOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | null;
}

const ROUTE_JSONLD_SELECTOR = 'script[data-tokki-jsonld="route"]';

function upsertRouteJsonLd(serializedJsonLd: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLScriptElement>(ROUTE_JSONLD_SELECTOR);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-tokki-jsonld', 'route');
    document.head.appendChild(el);
  }
  el.textContent = serializedJsonLd;
}

function removeRouteJsonLd(): void {
  if (typeof document === 'undefined') return;
  document.head.querySelector(ROUTE_JSONLD_SELECTOR)?.remove();
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string): void {
  if (typeof document === 'undefined') return;
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function upsertCanonical(href: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeCanonical(): void {
  if (typeof document === 'undefined') return;
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

/**
 * Synchronizes document title, meta description, canonical link, og:url,
 * and robots directives for the active SPA route, restoring defaults on unmount.
 */
export function usePageMeta({
  title,
  description,
  canonicalPath,
  noindex = false,
  jsonLd = null,
}: PageMetaOptions): void {
  const serializedJsonLd = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    document.title = title ?? DEFAULT_DOC_TITLE;
    upsertMeta('name', 'description', description ?? DEFAULT_DOC_DESCRIPTION);

    if (noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow');
      removeCanonical();
      removeRouteJsonLd();
    } else {
      removeMeta('name', 'robots');
      if (canonicalPath) {
        const normalized = canonicalPath === '/' ? '/' : canonicalPath;
        const fullUrl = `${PUBLIC_SITE_URL}${normalized}`;
        upsertCanonical(fullUrl);
        upsertMeta('property', 'og:url', fullUrl);
      }
      if (serializedJsonLd) {
        upsertRouteJsonLd(serializedJsonLd);
      } else {
        removeRouteJsonLd();
      }
    }

    return () => {
      document.title = DEFAULT_DOC_TITLE;
      upsertMeta('name', 'description', DEFAULT_DOC_DESCRIPTION);
      removeMeta('name', 'robots');
      upsertCanonical(`${PUBLIC_SITE_URL}/`);
      upsertMeta('property', 'og:url', `${PUBLIC_SITE_URL}/`);
      removeRouteJsonLd();
    };
  }, [title, description, canonicalPath, noindex, serializedJsonLd]);
}

export default usePageMeta;
