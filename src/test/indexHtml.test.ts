import { describe, it, expect } from 'vitest';
import html from '../../index.html?raw';

// Static contract test: link-preview / SEO tags must exist in the served
// shell. Crawlers (Instagram, TikTok, WhatsApp, Google) read these from the
// raw HTML — they never execute the SPA bundle.
function attr(selector: 'name' | 'property', value: string): string | undefined {
  const re = new RegExp(`<meta[^>]*${selector}="${value}"[^>]*>`, 'i');
  return html.match(re)?.[0];
}

describe('index.html — meta description & Open Graph', () => {
  it('tiene una meta description en español', () => {
    const tag = attr('name', 'description');
    expect(tag).toBeDefined();
    expect(tag!).toMatch(/tienda|accesorios|asiatica|coreana/i);
  });

  it('declara los tags Open Graph esenciales', () => {
    expect(attr('property', 'og:title')).toBeDefined();
    expect(attr('property', 'og:description')).toBeDefined();
    expect(attr('property', 'og:type')).toBeDefined();
    expect(attr('property', 'og:image')).toBeDefined();
    expect(attr('property', 'og:url')).toBeDefined();
  });

  it('og:image y og:url usan la URL pública del sitio (absolutas)', () => {
    const image = attr('property', 'og:image');
    const url = attr('property', 'og:url');
    // Vite replaces %VITE_PUBLIC_SITE_URL% at build time; both must start
    // with the placeholder or an https:// URL.
    expect(image).toMatch(/(https:\/\/|%VITE_PUBLIC_SITE_URL%)/);
    expect(url).toMatch(/(https:\/\/|%VITE_PUBLIC_SITE_URL%)/);
  });

  it('usa la imagen del logo como preview y declara twitter:card', () => {
    expect(attr('property', 'og:image')).toMatch(/tokki_logo/);
    expect(attr('name', 'twitter:card')).toMatch(/summary_large_image/);
  });

  it('el título es descriptivo para resultados de búsqueda', () => {
    expect(html).toMatch(/<title>[^<]{10,}<\/title>/);
  });
});
