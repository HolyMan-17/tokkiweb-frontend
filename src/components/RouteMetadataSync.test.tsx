import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RouteMetadataSync from './RouteMetadataSync';

describe('RouteMetadataSync Component', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <title>Default Title</title>
      <link rel="canonical" href="https://www.tokkishopve.com/" />
      <meta property="og:url" content="https://www.tokkishopve.com/" />
    `;
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  function renderWithRouter(initialEntry = '/') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <RouteMetadataSync />
        <Routes>
          <Route
            path="/"
            element={
              <div>
                Home Page
                <Link to="/categorias/albumes">Ir a Albumes</Link>
                <Link to="/products/205?ref=test">Ir a Producto</Link>
              </div>
            }
          />
          <Route path="/categorias/:slug" element={<div>Category Page</div>} />
          <Route path="/products/:id" element={<div>Product Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('actualiza canonical y og:url en la ruta inicial', () => {
    renderWithRouter('/categorias/albumes');

    const canonical = document.querySelector('link[rel="canonical"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');

    expect(canonical?.getAttribute('href')).toBe(
      'https://www.tokkishopve.com/categorias/albumes',
    );
    expect(ogUrl?.getAttribute('content')).toBe(
      'https://www.tokkishopve.com/categorias/albumes',
    );
    expect(document.title).toBe('Albumes — Tokki Shop');
  });

  it('elimina query parameters de la URL canónica y de og:url', () => {
    renderWithRouter('/products/205?ref=promo&fbclid=abc');

    const canonical = document.querySelector('link[rel="canonical"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');

    expect(canonical?.getAttribute('href')).toBe(
      'https://www.tokkishopve.com/products/205',
    );
    expect(ogUrl?.getAttribute('content')).toBe(
      'https://www.tokkishopve.com/products/205',
    );
    expect(canonical?.getAttribute('href')).toBe(ogUrl?.getAttribute('content'));
  });
});
