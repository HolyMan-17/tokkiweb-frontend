import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCleanCanonicalUrl,
  getRouteTitle,
  updateDocumentMetadata,
} from './routeMetadata';

describe('routeMetadata — getCleanCanonicalUrl', () => {
  const siteUrl = 'https://www.tokkishopve.com';

  it('genera la URL canónica raíz para "/"', () => {
    expect(getCleanCanonicalUrl('/', siteUrl)).toBe('https://www.tokkishopve.com/');
  });

  it('genera la URL canónica limpia para productos sin parámetros de consulta', () => {
    expect(getCleanCanonicalUrl('/products/205', siteUrl)).toBe(
      'https://www.tokkishopve.com/products/205',
    );
  });

  it('elimina parámetros de consulta y hashes en URLs de productos', () => {
    expect(
      getCleanCanonicalUrl('/products/205?ref=whatsapp&v=2#details', siteUrl),
    ).toBe('https://www.tokkishopve.com/products/205');
  });

  it('procesa correctamente URLs absolutas completas sin duplicar el dominio base', () => {
    expect(
      getCleanCanonicalUrl(
        'https://www.tokkishopve.com/products/205?ref=promo#hash',
        siteUrl,
      ),
    ).toBe('https://www.tokkishopve.com/products/205');
  });

  it('elimina parámetros de consulta en URLs de categorías', () => {
    expect(
      getCleanCanonicalUrl('/categorias/albumes?sort=price-asc&page=1', siteUrl),
    ).toBe('https://www.tokkishopve.com/categorias/albumes');
  });

  it('normaliza barras diagonales finales en subrutas', () => {
    expect(getCleanCanonicalUrl('/productos/', siteUrl)).toBe(
      'https://www.tokkishopve.com/productos',
    );
    expect(getCleanCanonicalUrl('/cart/', siteUrl)).toBe(
      'https://www.tokkishopve.com/cart',
    );
  });
});

describe('routeMetadata — getRouteTitle', () => {
  it('devuelve el título oficial para la página de inicio', () => {
    expect(getRouteTitle('/')).toBe('Tokki Shop — Accesorios y Dulces Coreanos');
  });

  it('devuelve el título correcto para /productos', () => {
    expect(getRouteTitle('/productos')).toBe('Todos los Productos — Tokki Shop');
  });

  it('resuelve el nombre de la categoría para /categorias/:slug', () => {
    expect(getRouteTitle('/categorias/albumes')).toBe('Albumes — Tokki Shop');
    expect(getRouteTitle('/categorias/zona-kpop')).toBe('Zona KPOP — Tokki Shop');
  });

  it('devuelve títulos descriptivos para carrito y checkout', () => {
    expect(getRouteTitle('/cart')).toBe('Carrito de Compras — Tokki Shop');
    expect(getRouteTitle('/checkout')).toBe('Finalizar Compra — Tokki Shop');
  });
});

describe('routeMetadata — updateDocumentMetadata (DOM head update)', () => {
  beforeEach(() => {
    // Reset head elements before each test
    document.head.innerHTML = `
      <title>Default Title</title>
      <link rel="canonical" href="https://www.tokkishopve.com/" />
      <meta property="og:url" content="https://www.tokkishopve.com/" />
    `;
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('actualiza href de rel="canonical" y content de og:url haciéndolos coincidir', () => {
    updateDocumentMetadata('/products/205?v=2', {
      siteUrl: 'https://www.tokkishopve.com',
    });

    const updatedCanonical = document.querySelector('link[rel="canonical"]');
    const updatedOgUrl = document.querySelector('meta[property="og:url"]');

    expect(updatedCanonical?.getAttribute('href')).toBe(
      'https://www.tokkishopve.com/products/205',
    );
    expect(updatedOgUrl?.getAttribute('content')).toBe(
      'https://www.tokkishopve.com/products/205',
    );
    expect(updatedCanonical?.getAttribute('href')).toBe(
      updatedOgUrl?.getAttribute('content'),
    );
  });

  it('actualiza el título del documento según la ruta', () => {
    updateDocumentMetadata('/categorias/albumes', {
      siteUrl: 'https://www.tokkishopve.com',
    });

    expect(document.title).toBe('Albumes — Tokki Shop');
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://www.tokkishopve.com/categorias/albumes');
  });

  it('crea los elementos link canonical y meta og:url si no existían en el head', () => {
    document.head.innerHTML = '<title>Sin tags</title>';

    updateDocumentMetadata('/productos', {
      siteUrl: 'https://www.tokkishopve.com',
    });

    const newCanonical = document.querySelector('link[rel="canonical"]');
    const newOgUrl = document.querySelector('meta[property="og:url"]');

    expect(newCanonical).not.toBeNull();
    expect(newCanonical?.getAttribute('href')).toBe(
      'https://www.tokkishopve.com/productos',
    );
    expect(newOgUrl).not.toBeNull();
    expect(newOgUrl?.getAttribute('content')).toBe(
      'https://www.tokkishopve.com/productos',
    );
  });
});
