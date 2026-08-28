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

  it('declara favicons compatibles con Google Search (múltiplo de 48px y formato PNG/ICO)', () => {
    expect(html).toMatch(/<link[^>]*rel="icon"[^>]*sizes="48x48"[^>]*href="\/favicon-48x48\.png"/);
    expect(html).toMatch(/<link[^>]*rel="icon"[^>]*href="\/favicon\.ico"/);
    expect(html).toMatch(/<link[^>]*rel="apple-touch-icon"[^>]*href="\/apple-touch-icon\.png"/);
    expect(html).toMatch(/<link[^>]*rel="manifest"[^>]*href="\/site\.webmanifest"/);
  });

  it('no contiene referencias residuales al icono de Vite', () => {
    expect(html).not.toMatch(/vite\.svg/i);
  });
});

describe('SEO — robots.txt y sitemap.xml', () => {
  it('robots.txt permite el rastreo y declara el sitemap canónico', async () => {
    const robotsModule = await import('../../public/robots.txt?raw');
    const robots = robotsModule.default;
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://www.tokkishopve.com/sitemap.xml');
  });

  it('sitemap.xml contiene la página de inicio, /productos y todas las categorías', async () => {
    const sitemapModule = await import('../../public/sitemap.xml?raw');
    const sitemap = sitemapModule.default;
    expect(sitemap).toContain('https://www.tokkishopve.com/');
    expect(sitemap).toContain('https://www.tokkishopve.com/productos');
    expect(sitemap).toContain('https://www.tokkishopve.com/categorias/bolsos-y-carteras');
    expect(sitemap).toContain('https://www.tokkishopve.com/categorias/zona-kpop');
    expect(sitemap).toContain('https://www.tokkishopve.com/categorias/dulces-&amp;-comida-asiatica');
  });
});
