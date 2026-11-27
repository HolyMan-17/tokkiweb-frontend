import { describe, expect, it } from 'vitest';
import { buildBreadcrumbJsonLd, buildProductJsonLd } from './structuredData';
import type { Product } from '../types';

const SITE_URL = 'https://www.tokkishopve.com';

const BASE_PRODUCT: Product = {
  product_id: 42,
  product_name: 'Gloss Conejito Rosa',
  product_price: '5.5',
  product_description: 'Brillo labial hidratante kawaii.',
  category: 'Maquillaje',
  qty_available: 8,
  in_stock: true,
  product_image_url: '/images/products/gloss-1.webp',
  product_image_urls: [
    '/images/products/gloss-1.webp',
    'https://api.tokkishopve.com/images/products/gloss-2.webp',
    '/images/products/gloss-1.webp',
  ],
};

describe('structuredData — buildProductJsonLd', () => {
  it('genera Product + Offer + BreadcrumbList con imágenes absolutas deduplicadas y precio en USD', () => {
    const ld = buildProductJsonLd(BASE_PRODUCT, SITE_URL);

    expect(ld['@context']).toBe('https://schema.org');
    const graph = ld['@graph'] as Array<Record<string, unknown>>;
    expect(Array.isArray(graph)).toBe(true);

    const productNode = graph.find((n) => n['@type'] === 'Product');
    expect(productNode).toBeDefined();
    expect(productNode?.name).toBe('Gloss Conejito Rosa');
    expect(productNode?.description).toBe('Brillo labial hidratante kawaii.');
    expect(productNode?.sku).toBe('42');
    expect(productNode?.category).toBe('Maquillaje');
    expect(productNode?.brand).toEqual({ '@type': 'Brand', name: 'Tokki Shop' });
    expect(productNode?.image).toEqual([
      'https://www.tokkishopve.com/images/products/gloss-1.webp',
      'https://api.tokkishopve.com/images/products/gloss-2.webp',
    ]);

    const offer = productNode?.offers as Record<string, unknown>;
    expect(offer['@type']).toBe('Offer');
    expect(offer.url).toBe('https://www.tokkishopve.com/products/42');
    expect(offer.priceCurrency).toBe('USD');
    expect(offer.price).toBe('5.50');
    expect(offer.availability).toBe('https://schema.org/InStock');
    expect(offer.itemCondition).toBe('https://schema.org/NewCondition');
    expect(offer.seller).toEqual({
      '@type': 'Store',
      '@id': 'https://www.tokkishopve.com/#store',
      name: 'Tokki Shop',
    });

    const breadcrumb = graph.find((n) => n['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.tokkishopve.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Maquillaje',
        item: 'https://www.tokkishopve.com/categorias/maquillaje',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Gloss Conejito Rosa',
        item: 'https://www.tokkishopve.com/products/42',
      },
    ]);
  });

  it('usa fallback de imagen y marca OutOfStock cuando no hay stock; omite categoría desconocida del breadcrumb', () => {
    const outOfStock: Product = {
      ...BASE_PRODUCT,
      product_id: 99,
      category: 'Edición Especial Inexistente',
      qty_available: 0,
      in_stock: false,
      product_image_url: undefined,
      product_image_urls: [],
    };

    const ld = buildProductJsonLd(outOfStock, SITE_URL);
    const graph = ld['@graph'] as Array<Record<string, unknown>>;
    const productNode = graph.find((n) => n['@type'] === 'Product');
    const offer = productNode?.offers as Record<string, unknown>;
    const breadcrumb = graph.find((n) => n['@type'] === 'BreadcrumbList');

    expect(productNode?.image).toEqual(['https://www.tokkishopve.com/tokki_logo.png']);
    expect(offer.availability).toBe('https://schema.org/OutOfStock');
    expect(breadcrumb?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.tokkishopve.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Gloss Conejito Rosa',
        item: 'https://www.tokkishopve.com/products/99',
      },
    ]);
  });

  it('usa el precio con descuento activo en Offer.price', () => {
    const ld = buildProductJsonLd({
      ...BASE_PRODUCT,
      product_price: '10.00',
      discount_percent: 20,
    }, SITE_URL);

    const graph = ld['@graph'] as Array<Record<string, unknown>>;
    const productNode = graph.find((n) => n['@type'] === 'Product');
    const offer = productNode?.offers as Record<string, unknown>;
    expect(offer.price).toBe('8.00');
  });
});

describe('structuredData — buildBreadcrumbJsonLd', () => {
  it('genera BreadcrumbList válido con posiciones secuenciales 1-based y URLs absolutas', () => {
    const ld = buildBreadcrumbJsonLd(
      [
        { name: 'Inicio', path: '/' },
        { name: 'Papeleria', path: '/categorias/papeleria' },
      ],
      SITE_URL,
    );

    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.tokkishopve.com/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Papeleria',
          item: 'https://www.tokkishopve.com/categorias/papeleria',
        },
      ],
    });
  });
});
