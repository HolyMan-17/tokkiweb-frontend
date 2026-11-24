import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DOC_DESCRIPTION,
  DEFAULT_DOC_TITLE,
  usePageMeta,
  type PageMetaOptions,
} from './usePageMeta';

function MetaHarness(props: PageMetaOptions) {
  usePageMeta(props);
  return null;
}

function seedDefaultHead() {
  document.title = DEFAULT_DOC_TITLE;
  document.head.innerHTML = `
    <meta name="description" content="${DEFAULT_DOC_DESCRIPTION}" />
    <link rel="canonical" href="https://www.tokkishopve.com/" />
    <meta property="og:url" content="https://www.tokkishopve.com/" />
  `;
}

describe('usePageMeta', () => {
  beforeEach(() => {
    seedDefaultHead();
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.title = DEFAULT_DOC_TITLE;
  });

  it('actualiza document.title, description, canonical y og:url para rutas indexables', () => {
    render(
      <MetaHarness
        title="Maquillaje | Tokki Shop"
        description="Compra Maquillaje en Tokki Shop."
        canonicalPath="/categorias/maquillaje"
      />,
    );

    expect(document.title).toBe('Maquillaje | Tokki Shop');
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Compra Maquillaje en Tokki Shop.',
    );
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.tokkishopve.com/categorias/maquillaje',
    );
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://www.tokkishopve.com/categorias/maquillaje',
    );
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('inyecta meta robots noindex,nofollow y elimina canonical cuando noindex es true', () => {
    render(<MetaHarness title="404 — Página no encontrada | Tokki Shop" noindex />);

    expect(document.title).toBe('404 — Página no encontrada | Tokki Shop');
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('elimina meta robots al navegar de una ruta noindex a una ruta indexable y restaura defaults al desmontar', () => {
    const { rerender, unmount } = render(
      <MetaHarness title="Mi Carrito | Tokki Shop" noindex />,
    );
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );

    rerender(
      <MetaHarness
        title="Todos los productos | Tokki Shop"
        description="Catálogo completo."
        canonicalPath="/productos"
      />,
    );

    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.tokkishopve.com/productos',
    );

    unmount();
    expect(document.title).toBe(DEFAULT_DOC_TITLE);
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      DEFAULT_DOC_DESCRIPTION,
    );
  });
});
