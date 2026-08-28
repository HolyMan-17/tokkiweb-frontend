import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CategoryPage from './CategoryPage';
import { CartProvider } from '../../context/CartContext';
import { fetchAllProducts } from '../../api/products';
import type { Product } from '../../types';

vi.mock('../../api/products', () => ({
  fetchAllProducts: vi.fn(),
}));

const mockFetchAllProducts = vi.mocked(fetchAllProducts);

const glossMariposa: Product = {
  product_id: 101,
  product_name: 'Gloss Mariposa',
  product_price: '5.00',
  product_description: 'Brillo hidratante con efecto espejo.',
  qty_available: 10,
  in_stock: true,
  category: 'Maquillaje',
};

const sombrasRosadas: Product = {
  product_id: 102,
  product_name: 'Sombras Rosadas',
  product_price: '7.00',
  product_description: 'Paleta de sombras en tonos pastel.',
  qty_available: 5,
  in_stock: true,
  category: 'Maquillaje',
};

function renderCategory() {
  return render(
    <MemoryRouter initialEntries={['/categorias/maquillaje']}>
      <CartProvider>
        <Routes>
          <Route path="/categorias/:slug" element={<CategoryPage />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

describe('CategoryPage — búsqueda por nombre + descripción', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    mockFetchAllProducts.mockResolvedValue([glossMariposa, sombrasRosadas]);
  });

  it('mantiene visible el producto cuyo término solo aparece en la descripción', async () => {
    const user = userEvent.setup();
    renderCategory();

    expect(await screen.findByText('Gloss Mariposa')).toBeInTheDocument();
    expect(screen.getByText('Sombras Rosadas')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Buscar/i), 'hidratante');

    // "hidratante" solo existe en la descripción del Gloss Mariposa.
    expect(screen.getByText('Gloss Mariposa')).toBeInTheDocument();
    expect(screen.queryByText('Sombras Rosadas')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 2 productos')).toBeInTheDocument();
  });

  it('renderiza la página de categoría Zona KPOP con su icono kpop.png y productos correspondientes', async () => {
    const kpopProduct: Product = {
      product_id: 201,
      product_name: 'Photocard Set BTS',
      product_price: '6.50',
      product_description: 'Set de photocards holográficas.',
      qty_available: 20,
      in_stock: true,
      category: 'Zona KPOP',
    };

    mockFetchAllProducts.mockResolvedValue([glossMariposa, kpopProduct]);

    render(
      <MemoryRouter initialEntries={['/categorias/zona-kpop']}>
        <CartProvider>
          <Routes>
            <Route path="/categorias/:slug" element={<CategoryPage />} />
          </Routes>
        </CartProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Zona KPOP')).toBeInTheDocument();
    expect(screen.getByText('Photocard Set BTS')).toBeInTheDocument();
    expect(screen.queryByText('Gloss Mariposa')).not.toBeInTheDocument();

    const titleImg = document.querySelector('.category-page-title img');
    expect(titleImg).not.toBeNull();
    expect(titleImg?.getAttribute('src')).toContain('kpop');
  });

  it('renderiza la página de categoría Bolsas o cajas de regalo con su icono gift.gif y productos correspondientes', async () => {
    const giftProduct: Product = {
      product_id: 301,
      product_name: 'Caja de Regalo Kawaii Corazones',
      product_price: '4.00',
      product_description: 'Caja rígida con lazo de satén.',
      qty_available: 25,
      in_stock: true,
      category: 'Bolsas o cajas de regalo',
    };

    mockFetchAllProducts.mockResolvedValue([glossMariposa, giftProduct]);

    render(
      <MemoryRouter initialEntries={['/categorias/bolsas-o-cajas-de-regalo']}>
        <CartProvider>
          <Routes>
            <Route path="/categorias/:slug" element={<CategoryPage />} />
          </Routes>
        </CartProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Bolsas o cajas de regalo')).toBeInTheDocument();
    expect(screen.getByText('Caja de Regalo Kawaii Corazones')).toBeInTheDocument();
    expect(screen.queryByText('Gloss Mariposa')).not.toBeInTheDocument();

    const titleImg = document.querySelector('.category-page-title img');
    expect(titleImg).not.toBeNull();
    expect(titleImg?.getAttribute('src')).toContain('gift');
  });
});
