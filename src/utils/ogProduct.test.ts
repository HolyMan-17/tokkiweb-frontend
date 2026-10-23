import { describe, it, expect } from 'vitest';
import { buildProductOgHtml, buildFallbackOgHtml, buildCategoryOgHtml } from './ogProduct';
import type { Product } from '../types';

describe('buildProductOgHtml', () => {
  const baseProduct: Product = {
    product_id: 30,
    product_name: 'POPSOCKET JUNGKOOK',
    product_price: '4.80',
    product_description: 'Popsocket acrílico BTS Jungkook de alta calidad',
    category: 'Zona KPOP',
    qty_available: 5,
    in_stock: true,
    product_image_url: 'https://api.tokkishopve.com/images/products/jungkook.webp',
  };

  const options = {
    siteUrl: 'https://www.tokkishopve.com',
  };

  it('genera etiquetas Open Graph completas con nombre, precio formateado y URL canónica', () => {
    const html = buildProductOgHtml(baseProduct, options);

    expect(html).toContain('<title>POPSOCKET JUNGKOOK — $4.80 | Tokki Shop</title>');
    expect(html).toContain('<meta property="og:title" content="POPSOCKET JUNGKOOK — $4.80 | Tokki Shop" />');
    expect(html).toContain('<meta property="og:type" content="product" />');
    expect(html).toContain('<meta property="og:site_name" content="Tokki Shop" />');
    expect(html).toContain('<meta property="og:url" content="https://www.tokkishopve.com/products/30" />');
    expect(html).toContain('<link rel="canonical" href="https://www.tokkishopve.com/products/30" />');
  });

  it('incluye etiquetas específicas de producto (precio en USD y disponibilidad en stock)', () => {
    const html = buildProductOgHtml(baseProduct, options);

    expect(html).toContain('<meta property="product:price:amount" content="4.80" />');
    expect(html).toContain('<meta property="product:price:currency" content="USD" />');
    expect(html).toContain('<meta property="product:availability" content="in stock" />');
  });

  it('indica "out of stock" cuando el producto no está en existencia', () => {
    const outOfStockProduct: Product = {
      ...baseProduct,
      qty_available: 0,
      in_stock: false,
    };
    const html = buildProductOgHtml(outOfStockProduct, options);

    expect(html).toContain('<meta property="product:availability" content="out of stock" />');
  });

  it('incluye Twitter Card summary_large_image con imagen y título', () => {
    const html = buildProductOgHtml(baseProduct, options);

    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('<meta name="twitter:title" content="POPSOCKET JUNGKOOK — $4.80 | Tokki Shop" />');
    expect(html).toContain('<meta name="twitter:image" content="https://api.tokkishopve.com/images/products/jungkook.webp" />');
  });

  it('resuelve URLs de imagen relativas a la URL absoluta del sitio', () => {
    const relativeImageProduct: Product = {
      ...baseProduct,
      product_image_url: '/images/products/sample.webp',
    };
    const html = buildProductOgHtml(relativeImageProduct, options);

    expect(html).toContain('<meta property="og:image" content="https://www.tokkishopve.com/images/products/sample.webp" />');
  });

  it('usa el logo por defecto de Tokki Shop cuando el producto no tiene imagen', () => {
    const noImageProduct: Product = {
      ...baseProduct,
      product_image_url: undefined,
    };
    const html = buildProductOgHtml(noImageProduct, options);

    expect(html).toContain('<meta property="og:image" content="https://www.tokkishopve.com/tokki_logo.png" />');
  });

  it('escapa caracteres especiales HTML para prevenir XSS y roturas de etiquetas', () => {
    const maliciousProduct: Product = {
      ...baseProduct,
      product_name: 'Gloss <script>alert("xss")</script> & "Kawaii"',
      product_description: 'Descripción con "comillas" & <tags>',
    };
    const html = buildProductOgHtml(maliciousProduct, options);

    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('Gloss &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &quot;Kawaii&quot;');
    expect(html).toContain('Descripción con &quot;comillas&quot; &amp; &lt;tags&gt;');
  });

  it('incluye script de redirección y meta refresh al producto para navegadores humanos', () => {
    const html = buildProductOgHtml(baseProduct, options);

    expect(html).toContain('<meta http-equiv="refresh" content="0;url=https://www.tokkishopve.com/products/30" />');
    expect(html).toContain('window.location.replace("https://www.tokkishopve.com/products/30")');
  });
});

describe('buildFallbackOgHtml', () => {
  it('genera metadatos genéricos de Tokki Shop cuando el producto no existe', () => {
    const html = buildFallbackOgHtml({
      siteUrl: 'https://www.tokkishopve.com',
      targetUrl: 'https://www.tokkishopve.com/products/999',
    });

    expect(html).toContain('<title>Tokki Shop — Accesorios y Dulces Coreanos</title>');
    expect(html).toContain('<meta property="og:title" content="Tokki Shop — Accesorios y Dulces Coreanos" />');
    expect(html).toContain('<meta property="og:image" content="https://www.tokkishopve.com/tokki_logo.png" />');
    expect(html).toContain('<meta http-equiv="refresh" content="0;url=https://www.tokkishopve.com/products/999" />');
  });

  it('limpia los query parameters del canonical y og:url en fallback', () => {
    const html = buildFallbackOgHtml({
      siteUrl: 'https://www.tokkishopve.com',
      targetUrl: 'https://www.tokkishopve.com/products/999?ref=promo&fbclid=123',
    });

    expect(html).toContain('<link rel="canonical" href="https://www.tokkishopve.com/products/999" />');
    expect(html).toContain('<meta property="og:url" content="https://www.tokkishopve.com/products/999" />');
  });
});

describe('buildCategoryOgHtml', () => {
  it('genera metadatos Open Graph y rel="canonical" limpios y coincidentes para categorías', () => {
    const html = buildCategoryOgHtml('albumes', {
      siteUrl: 'https://www.tokkishopve.com',
    });

    expect(html).toContain('<title>Albumes — Tokki Shop</title>');
    expect(html).toContain('<meta property="og:title" content="Albumes — Tokki Shop" />');
    expect(html).toContain('<link rel="canonical" href="https://www.tokkishopve.com/categorias/albumes" />');
    expect(html).toContain('<meta property="og:url" content="https://www.tokkishopve.com/categorias/albumes" />');
  });

  it('elimina query parameters del canonical y og:url de categorías', () => {
    const html = buildCategoryOgHtml('zona-kpop?sort=price-asc', {
      siteUrl: 'https://www.tokkishopve.com',
    });

    expect(html).toContain('<link rel="canonical" href="https://www.tokkishopve.com/categorias/zona-kpop" />');
    expect(html).toContain('<meta property="og:url" content="https://www.tokkishopve.com/categorias/zona-kpop" />');
  });
});
