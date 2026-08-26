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
});
